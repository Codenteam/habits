// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "tauri-plugin-matter",
    platforms: [
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
                .product(name: "Tauri", package: "Tauri")
            ],
            path: "Sources"
        )
    ]
)
