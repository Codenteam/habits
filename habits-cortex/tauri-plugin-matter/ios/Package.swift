// swift-tools-version:5.3
// Tauri Plugin for Matter smart home devices

import PackageDescription

let package = Package(
    name: "tauri-plugin-matter",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v14)  // HomeKit with Matter requires iOS 14+
    ],
    products: [
        .library(
            name: "tauri-plugin-matter",
            type: .static,
            targets: ["tauri-plugin-matter"]
        )
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-matter",
            dependencies: [
                .byName(name: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
