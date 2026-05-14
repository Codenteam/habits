/**
 * // Needs permission fs:default OR matching fs:allow-<command> permissions.
// Needs fs scope entries for every path you want to access.
// Example scope issue: read/write/watch/stat paths must be allowed.
plugin:fs|read
plugin:fs|seek
plugin:fs|fstat
plugin:fs|ftruncate
plugin:fs|write
plugin:fs|create
plugin:fs|open
plugin:fs|copy_file
plugin:fs|mkdir
plugin:fs|read_dir
plugin:fs|read_file
plugin:fs|read_text_file
plugin:fs|read_text_file_lines
plugin:fs|read_text_file_lines_next
plugin:fs|remove
plugin:fs|rename
plugin:fs|stat
plugin:fs|lstat
plugin:fs|truncate
plugin:fs|write_file
plugin:fs|write_text_file
plugin:fs|exists
plugin:fs|watch
plugin:fs|size
plugin:fs|start_accessing_security_scoped_resource
plugin:fs|stop_accessing_security_scoped_resource

// Needs permission dialog:default OR these:
// dialog:allow-open
// dialog:allow-save
// dialog:allow-message
// Note: Android/iOS do not support folder picker.
plugin:dialog|open
plugin:dialog|save
plugin:dialog|message

// Needs permission clipboard-manager:allow-read-text / clipboard-manager:allow-write-text.
// Mobile-safe clipboard support is text-only.
plugin:clipboard-manager|write_text
plugin:clipboard-manager|read_text

// Needs permission shell:allow-open.
// Needs shell open scope for URL schemes/domains, commonly http(s), tel, mailto.
plugin:shell|open

// Needs permission opener:allow-open-url.
// Mobile only supports opening URLs, not opening/revealing local paths.
plugin:opener|open_url

// Needs permission http:default OR these:
// http:allow-fetch
// http:allow-fetch-cancel
// http:allow-fetch-send
// http:allow-fetch-read-body
// http:allow-fetch-cancel-body
// Needs HTTP scope/origin allowlist for the URLs you fetch.
plugin:http|fetch
plugin:http|fetch_cancel
plugin:http|fetch_send
plugin:http|fetch_cancel_body
plugin:http|fetch_read_body

// Needs permission notification:default OR matching notification:allow-<command> permissions.
// On mobile, also needs runtime notification permission from the OS before showing notifications.
plugin:notification|is_permission_granted
plugin:notification|register_action_types
plugin:notification|get_pending
plugin:notification|cancel
plugin:notification|get_active
plugin:notification|remove_active
plugin:notification|create_channel
plugin:notification|delete_channel
plugin:notification|listChannels

// Needs permission store:default OR these:
// store:allow-load
// store:allow-get-store
// store:allow-set
// store:allow-get
// store:allow-has
// store:allow-delete
// store:allow-clear
// store:allow-reset
// store:allow-keys
// store:allow-values
// store:allow-entries
// store:allow-length
// store:allow-reload
// store:allow-save
plugin:store|load
plugin:store|get_store
plugin:store|set
plugin:store|get
plugin:store|has
plugin:store|delete
plugin:store|clear
plugin:store|reset
plugin:store|keys
plugin:store|values
plugin:store|entries
plugin:store|length
plugin:store|reload
plugin:store|save

// Needs permission sql:default for load/select/close.
// Needs extra permission sql:allow-execute for execute.
plugin:sql|load
plugin:sql|execute
plugin:sql|select
plugin:sql|close

// Needs permission log:default OR log:allow-log.
plugin:log|log

// Needs permission process:default OR these:
// process:allow-exit
// process:allow-restart
plugin:process|exit
plugin:process|restart

// Needs permission os:default OR these:
// os:allow-locale
// os:allow-hostname
plugin:os|locale
plugin:os|hostname

// Needs permission deep-link:default OR matching deep-link:allow-<command> permissions.
// On Android/iOS, runtime register/unregister is not reliable; configure deep links in app config.
plugin:deep-link|get_current

// Needs permission websocket:default OR these:
// websocket:allow-connect
// websocket:allow-send
// Needs URL/domain scope depending on your websocket configuration.
plugin:websocket|connect
plugin:websocket|send
 */