package app.tauri.sms

import android.Manifest
import android.app.Activity
import android.content.ContentResolver
import android.content.pm.PackageManager
import android.net.Uri
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.Permission
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

private const val TAG = "SmsPlugin"

@InvokeArg
class SendSmsArgs {
    lateinit var phoneNumber: String
    lateinit var message: String
}

@InvokeArg
class ReadSmsArgs {
    var phoneNumber: String? = null
    var limit: Int = 50
    var folder: String = "all"
    var unreadOnly: Boolean = false
}

@TauriPlugin(
    permissions = [
        Permission(strings = [Manifest.permission.SEND_SMS], alias = "sendSms"),
        Permission(strings = [Manifest.permission.READ_SMS], alias = "readSms"),
        Permission(strings = [Manifest.permission.RECEIVE_SMS], alias = "receiveSms")
    ]
)
class SmsPlugin(private val activity: Activity) : Plugin(activity) {
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    @Command
    fun sendSms(invoke: Invoke) {
        scope.launch {
            try {
                val args = invoke.parseArgs(SendSmsArgs::class.java)
                val phoneNumber = args.phoneNumber
                val message = args.message
                
                Log.d(TAG, "Sending SMS to $phoneNumber")
                
                // Check permission
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.SEND_SMS)
                    != PackageManager.PERMISSION_GRANTED) {
                    val ret = JSObject()
                    ret.put("success", false)
                    ret.put("error", "SEND_SMS permission not granted")
                    invoke.resolve(ret)
                    return@launch
                }
                
                // Validate phone number (basic validation)
                if (phoneNumber.isBlank()) {
                    val ret = JSObject()
                    ret.put("success", false)
                    ret.put("error", "Phone number cannot be empty")
                    invoke.resolve(ret)
                    return@launch
                }
                
                // Get SMS manager and send
                val smsManager = activity.getSystemService(SmsManager::class.java)
                
                // Handle long messages by splitting them
                if (message.length > 160) {
                    val parts = smsManager.divideMessage(message)
                    smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
                } else {
                    smsManager.sendTextMessage(phoneNumber, null, message, null, null)
                }
                
                val ret = JSObject()
                ret.put("success", true)
                ret.put("messageId", System.currentTimeMillis().toString())
                invoke.resolve(ret)
                
                Log.d(TAG, "SMS sent successfully to $phoneNumber")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send SMS", e)
                val ret = JSObject()
                ret.put("success", false)
                ret.put("error", e.message ?: "Unknown error")
                invoke.resolve(ret)
            }
        }
    }
    
    @Command
    fun readSms(invoke: Invoke) {
        scope.launch {
            try {
                val args = invoke.parseArgs(ReadSmsArgs::class.java)
                
                Log.d(TAG, "Reading SMS messages, folder: ${args.folder}, limit: ${args.limit}")
                
                // Check permission
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_SMS)
                    != PackageManager.PERMISSION_GRANTED) {
                    invoke.reject("READ_SMS permission not granted")
                    return@launch
                }
                
                val messages = mutableListOf<JSObject>()
                val contentResolver: ContentResolver = activity.contentResolver
                
                // Determine which URI to query based on folder
                val uris = when (args.folder.lowercase()) {
                    "inbox" -> listOf(Uri.parse("content://sms/inbox"))
                    "sent" -> listOf(Uri.parse("content://sms/sent"))
                    else -> listOf(
                        Uri.parse("content://sms/inbox"),
                        Uri.parse("content://sms/sent")
                    )
                }
                
                for (uri in uris) {
                    val messageType = if (uri.toString().contains("sent")) "sent" else "inbox"
                    
                    // Build selection criteria
                    var selection: String? = null
                    val selectionArgs = mutableListOf<String>()
                    
                    if (args.phoneNumber != null) {
                        selection = "address = ?"
                        selectionArgs.add(args.phoneNumber!!)
                    }
                    
                    if (args.unreadOnly && messageType == "inbox") {
                        selection = if (selection != null) "$selection AND read = 0" else "read = 0"
                    }
                    
                    val cursor = contentResolver.query(
                        uri,
                        arrayOf("_id", "address", "body", "date", "read"),
                        selection,
                        if (selectionArgs.isNotEmpty()) selectionArgs.toTypedArray() else null,
                        "date DESC LIMIT ${args.limit}"
                    )
                    
                    cursor?.use {
                        val idIndex = it.getColumnIndex("_id")
                        val addressIndex = it.getColumnIndex("address")
                        val bodyIndex = it.getColumnIndex("body")
                        val dateIndex = it.getColumnIndex("date")
                        val readIndex = it.getColumnIndex("read")
                        
                        while (it.moveToNext() && messages.size < args.limit) {
                            val msg = JSObject()
                            msg.put("id", it.getString(idIndex))
                            msg.put("phoneNumber", it.getString(addressIndex) ?: "")
                            msg.put("body", it.getString(bodyIndex) ?: "")
                            msg.put("timestamp", it.getLong(dateIndex))
                            msg.put("isRead", it.getInt(readIndex) == 1)
                            msg.put("messageType", messageType)
                            messages.add(msg)
                        }
                    }
                }
                
                // Sort by timestamp descending and limit
                messages.sortByDescending { it.getLong("timestamp") }
                val limitedMessages = messages.take(args.limit)
                
                val ret = JSObject()
                ret.put("messages", limitedMessages.map { it.toString() }.joinToString(",", "[", "]"))
                ret.put("totalCount", limitedMessages.size)
                
                // Convert messages array properly
                val messagesArray = org.json.JSONArray()
                limitedMessages.forEach { messagesArray.put(it) }
                ret.put("messages", messagesArray)
                
                invoke.resolve(ret)
                
                Log.d(TAG, "Read ${limitedMessages.size} SMS messages")
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read SMS", e)
                invoke.reject("Failed to read SMS: ${e.message}")
            }
        }
    }
}
