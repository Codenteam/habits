// swift-tools-version:5.3
// Tauri Plugin for Wi-Fi monitoring

import PackageDescription

let package = Package(
    name: "tauri-plugin-wifi",
    platforms: [
        .macOS(.v10_13),
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "tauri-plugin-wifi",
            type: .static,
            targets: ["tauri-plugin-wifi"]
        )
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-wifi",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
