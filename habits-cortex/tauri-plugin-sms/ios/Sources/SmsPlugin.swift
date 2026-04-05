import MessageUI
import SwiftUI
import Tauri
import UIKit
import WebKit

// MARK: - Argument Classes

class SendSmsArgs: Decodable {
    let phoneNumber: String
    let message: String
}

class ReadSmsArgs: Decodable {
    var phoneNumber: String?
    var limit: Int?
    var folder: String?
    var unreadOnly: Bool?
}

// MARK: - SMS Plugin

class SmsPlugin: Plugin, MFMessageComposeViewControllerDelegate {
    
    private var pendingInvoke: Invoke?
    
    @objc public func sendSms(_ invoke: Invoke) {
        do {
            let args = try invoke.parseArgs(SendSmsArgs.self)
            
            // Check if device can send SMS
            guard MFMessageComposeViewController.canSendText() else {
                invoke.resolve([
                    "success": false,
                    "error": "Device cannot send SMS"
                ])
                return
            }
            
            // Store invoke for callback
            self.pendingInvoke = invoke
            
            // Must be called on main thread for UI
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                
                let composeVC = MFMessageComposeViewController()
                composeVC.messageComposeDelegate = self
                composeVC.recipients = [args.phoneNumber]
                composeVC.body = args.message
                
                // Get the top view controller to present from
                if let topController = self.getTopViewController() {
                    topController.present(composeVC, animated: true, completion: nil)
                } else {
                    invoke.resolve([
                        "success": false,
                        "error": "Could not present SMS composer"
                    ])
                    self.pendingInvoke = nil
                }
            }
            
        } catch {
            invoke.resolve([
                "success": false,
                "error": "Failed to parse arguments: \(error.localizedDescription)"
            ])
        }
    }
    
    @objc public func readSms(_ invoke: Invoke) {
        // iOS does not allow reading SMS messages for privacy reasons
        // Only apps with special carrier entitlements can access SMS
        invoke.reject("Reading SMS is not available on iOS due to privacy restrictions. This functionality is only available on Android.")
    }
    
    // MARK: - MFMessageComposeViewControllerDelegate
    
    public func messageComposeViewController(
        _ controller: MFMessageComposeViewController,
        didFinishWith result: MessageComposeResult
    ) {
        controller.dismiss(animated: true) { [weak self] in
            guard let invoke = self?.pendingInvoke else { return }
            
            switch result {
            case .sent:
                invoke.resolve([
                    "success": true,
                    "messageId": UUID().uuidString
                ])
            case .cancelled:
                invoke.resolve([
                    "success": false,
                    "error": "User cancelled"
                ])
            case .failed:
                invoke.resolve([
                    "success": false,
                    "error": "Failed to send SMS"
                ])
            @unknown default:
                invoke.resolve([
                    "success": false,
                    "error": "Unknown result"
                ])
            }
            
            self?.pendingInvoke = nil
        }
    }
    
    // MARK: - Helpers
    
    private func getTopViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }),
              var topController = window.rootViewController else {
            return nil
        }
        
        while let presentedViewController = topController.presentedViewController {
            topController = presentedViewController
        }
        
        return topController
    }
}

@_cdecl("init_plugin_sms")
func initPlugin() -> Plugin {
    return SmsPlugin()
}
