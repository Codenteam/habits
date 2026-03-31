#[cfg(debug_assertions)]
use std::path::PathBuf;
#[cfg(debug_assertions)]
use xcap::Window;

#[cfg(debug_assertions)]
pub fn start_automation_server(app: tauri::AppHandle) {
    use std::net::TcpListener;
    use std::io::{Read, Write};
    use tauri::Manager;
    
    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:9987") {
            Ok(l) => l,
            Err(_) => return,
        };
        println!("[AUTOMATION] Server ready: http://127.0.0.1:9987");
        
        for stream in listener.incoming() {
            let (mut stream, app) = (stream.unwrap(), app.clone());
            std::thread::spawn(move || {
                let mut buf = [0; 4096];
                if let Ok(n) = stream.read(&mut buf) {
                    let req = String::from_utf8_lossy(&buf[..n]);
                    if let Some(start) = req.find("\r\n\r\n") {
                        let body = req[start + 4..].trim();
                        
                        if body == "screenshot" {
                            // Take screenshot of the current tauri window
                            if let Some(win) = app.get_webview_window("main") {
                                match take_tauri_window_screenshot(&win) {
                                    Ok(path) => {
                                        let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n{}", path.display());
                                        let _ = stream.write_all(response.as_bytes());
                                        return;
                                    }
                                    Err(e) => {
                                        let response = format!("HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\n{}", e);
                                        let _ = stream.write_all(response.as_bytes());
                                        return;
                                    }
                                }
                            } else {
                                let response = "HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\nWindow 'main' not found";
                                let _ = stream.write_all(response.as_bytes());
                                return;
                            }
                        } else if body.starts_with("resize:") {
                            // Resize window: "resize:1280x800"
                            let dims = &body[7..];
                            if let Some((w, h)) = dims.split_once('x') {
                                if let (Ok(width), Ok(height)) = (w.parse::<u32>(), h.parse::<u32>()) {
                                    if let Some(win) = app.get_webview_window("main") {
                                        use tauri::{PhysicalSize, PhysicalPosition};
                                        // Set position to 0,0 first
                                        let _ = win.set_position(PhysicalPosition::new(0, 0));
                                        match win.set_size(PhysicalSize::new(width, height)) {
                                            Ok(_) => {
                                                // Give time for resize to take effect
                                                std::thread::sleep(std::time::Duration::from_millis(500));
                                                let size = win.inner_size().unwrap_or(PhysicalSize::new(0, 0));
                                                let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n{}x{}", size.width, size.height);
                                                let _ = stream.write_all(response.as_bytes());
                                                return;
                                            }
                                            Err(e) => {
                                                let response = format!("HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\n{}", e);
                                                let _ = stream.write_all(response.as_bytes());
                                                return;
                                            }
                                        }
                                    } else {
                                        let response = "HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\nWindow 'main' not found";
                                        let _ = stream.write_all(response.as_bytes());
                                        return;
                                    }
                                }
                            }
                            let response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nInvalid resize format. Use: resize:WIDTHxHEIGHT";
                            let _ = stream.write_all(response.as_bytes());
                            return;
                        } else if body == "reload" {
                            // Reload the webview
                            if let Some(win) = app.get_webview_window("main") {
                                let url = win.url().map(|u| u.to_string()).unwrap_or_default();
                                match win.eval("location.reload()") {
                                    Ok(_) => {
                                        std::thread::sleep(std::time::Duration::from_millis(1000));
                                        let response = format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nReloaded: {}", url);
                                        let _ = stream.write_all(response.as_bytes());
                                        return;
                                    }
                                    Err(e) => {
                                        let response = format!("HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\n{}", e);
                                        let _ = stream.write_all(response.as_bytes());
                                        return;
                                    }
                                }
                            } else {
                                let response = "HTTP/1.1 500 Error\r\nContent-Type: text/plain\r\n\r\nWindow 'main' not found";
                                let _ = stream.write_all(response.as_bytes());
                                return;
                            }
                        } else if let Some(win) = app.get_webview_window("main") {
                            let _: Result<(), _> = win.eval(body);
                        }
                    }
                }
                let _ = stream.write_all(b"HTTP/1.1 200 OK\r\n\r\n");
            });
        }
    });
}

#[cfg(debug_assertions)]
fn take_tauri_window_screenshot(win: &tauri::WebviewWindow) -> Result<PathBuf, String> {
    // Get the tauri window title to find the matching xcap window
    let title = win.title().map_err(|e| e.to_string())?;
    
    let windows = Window::all().map_err(|e| e.to_string())?;
    
    // Match by app name containing "habits-cortex" or by window title
    let window = windows.iter().find(|w| {
        let app_match = w.app_name().map(|n| n.to_lowercase().contains("habits-cortex")).unwrap_or(false);
        let title_match = w.title().map(|t| t == title).unwrap_or(false);
        app_match || title_match
    });
    
    if let Some(window) = window {
        if window.is_minimized().unwrap_or(false) {
            return Err("Minimized windows can't take screenshots".to_string());
        }
        
        let image = window.capture_image().map_err(|e| e.to_string())?;
        
        // Save to temp directory
        let window_id = window.id().unwrap_or(0);
        let save_path = std::env::temp_dir().join(format!("habits_screenshot_{}.png", window_id));
        image.save(&save_path).map_err(|e| e.to_string())?;
        
        return Ok(save_path);
    }
    
    Err("Window not found".to_string())
}