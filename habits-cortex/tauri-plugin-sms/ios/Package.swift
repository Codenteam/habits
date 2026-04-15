// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "tauri-plugin-sms",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "tauri-plugin-sms",
            targets: ["tauri-plugin-sms"]
        )
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api")
    ],
    targets: [
        .target(
            name: "tauri-plugin-sms",
            dependencies: [
                .product(name: "Tauri", package: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
