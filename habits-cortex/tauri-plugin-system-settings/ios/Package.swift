// swift-tools-version:5.3
// Tauri Plugin for system settings control

import PackageDescription

let package = Package(
    name: "tauri-plugin-system-settings",
    platforms: [
        .macOS(.v10_13),
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "tauri-plugin-system-settings",
            type: .static,
            targets: ["tauri-plugin-system-settings"]
        )
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-system-settings",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
