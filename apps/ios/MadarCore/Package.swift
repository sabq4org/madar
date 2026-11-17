// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MadarCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "MadarCore", targets: ["MadarCore"])],
    targets: [
        .target(name: "MadarCore"),
        .testTarget(name: "MadarCoreTests", dependencies: ["MadarCore"])
    ]
)
