import MadarCore
import SwiftUI

@main
struct MadarApp: App {
  @StateObject private var store: MadarStore

  init() {
    // UI tests use their own preferences domain, never the reader's saved choices.
    let arguments = ProcessInfo.processInfo.arguments
    let defaults =
      arguments.contains("--uitesting")
      ? UserDefaults(suiteName: "org.madar.preview.ui-tests") ?? .standard
      : .standard
    let store = MadarStore(defaults: defaults)
    if arguments.contains("--uitesting") && arguments.contains("--reset-demo") {
      store.resetDemo()
    }
    _store = StateObject(wrappedValue: store)
  }

  var body: some Scene {
    WindowGroup {
      MadarRootView()
        .environmentObject(store)
        .environment(\.layoutDirection, .rightToLeft)
        .environment(\.locale, Locale(identifier: "ar_SA"))
        .preferredColorScheme(.light)
    }
  }
}
