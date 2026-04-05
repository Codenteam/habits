// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-system-settings",
    platforms: [
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
                .product(name: "Tauri", package: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
