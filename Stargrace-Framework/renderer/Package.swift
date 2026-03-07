// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "StargraceRenderer",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
    ],
    products: [
        .executable(
            name: "StargraceRenderer",
            targets: ["StargraceRenderer"]
        ),
    ],
    targets: [
        .executableTarget(
            name: "StargraceRenderer",
            linkerSettings: [
                .linkedFramework("SwiftUI"),
                .linkedFramework("AppKit", .when(platforms: [.macOS])),
            ]
        ),
    ]
)
