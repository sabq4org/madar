import Foundation
import XCTest

@testable import MadarCore

@MainActor final class MadarStoreTests: XCTestCase {
  private func defaults() -> (UserDefaults, String) {
    let suite = "MadarCoreTests-\(UUID().uuidString)"
    return (UserDefaults(suiteName: suite)!, suite)
  }
  private func clean(_ suite: String) {
    UserDefaults.standard.removePersistentDomain(forName: suite)
  }

  func testMatchingFollowCreatesOneNoticeAndNonmatchingOnlyUpdates() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let store = MadarStore(defaults: defaults)
    store.follow(.transport, kind: .price)
    XCTAssertEqual(store.simulate(.transport, kind: .date), .updated)
    XCTAssertTrue(store.notices.isEmpty)
    XCTAssertEqual(store.simulate(.transport, kind: .price), .notified)
    XCTAssertEqual(store.notices.count, 1)
    XCTAssertEqual(store.simulate(.transport, kind: .price), .duplicate)
    XCTAssertEqual(store.notices.count, 1)
    XCTAssertEqual(store.updates(for: .transport).count, 2)
  }

  func testStatePersistsAcrossStoreInstancesAndDuplicateReplayIsIdempotent() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let first = MadarStore(defaults: defaults)
    first.toggleBookmark(.training)
    first.follow(.training, kind: .launch)
    XCTAssertEqual(first.simulate(.training, kind: .launch), .notified)
    let restored = MadarStore(defaults: defaults)
    XCTAssertTrue(restored.bookmarks.contains(.training))
    XCTAssertEqual(restored.follows[.training], .launch)
    XCTAssertEqual(restored.simulateDuplicate(.training), .duplicate)
    XCTAssertEqual(restored.simulate(.training, kind: .launch), .duplicate)
    XCTAssertEqual(restored.notices.count, 1)
    XCTAssertEqual(restored.updates(for: .training).count, 1)
  }

  func testReadMarkersPersistAndNewUpdateBecomesUnread() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let store = MadarStore(defaults: defaults)
    XCTAssertEqual(store.unreadCount, 2)
    store.markRead(.transport)
    XCTAssertFalse(MadarStore(defaults: defaults).isUnread(.transport))
    _ = store.simulate(.transport, kind: .date)
    XCTAssertTrue(store.isUnread(.transport))
    XCTAssertEqual(store.unreadCount, 2)
  }

  func testFactsRetainEarlierKindsAndPriceResolvesUnknown() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let store = MadarStore(defaults: defaults)
    _ = store.simulate(.transport, kind: .price)
    _ = store.simulate(.transport, kind: .date)
    XCTAssertEqual(
      store.knownFacts(for: .transport),
      ["موعد التشغيل: 5 ديسمبر", "أُعلنت أسعار التذاكر والاشتراكات"])
    XCTAssertNil(store.unknownFact(for: .transport))
  }

  func testCorruptDataIsPreservedThroughAutomaticReadMarkUntilExplicitReset() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let key = "madar.demo.state.v1"
    let corrupt = Data("not-json".utf8)
    defaults.set(corrupt, forKey: key)
    let store = MadarStore(defaults: defaults)
    XCTAssertNotNil(store.storageError)
    XCTAssertEqual(defaults.data(forKey: key), corrupt)
    XCTAssertTrue(store.bookmarks.isEmpty)
    store.markRead(.transport)  // Called automatically by the detail screen on appearance.
    store.toggleBookmark(.transport)
    store.follow(.transport, kind: .date)
    _ = store.simulate(.transport, kind: .date)
    XCTAssertEqual(defaults.data(forKey: key), corrupt)
    XCTAssertNotNil(store.storageError)
    store.resetDemo()
    XCTAssertNil(store.storageError)
    XCTAssertNotEqual(defaults.data(forKey: key), corrupt)
    XCTAssertTrue(MadarStore(defaults: defaults).bookmarks.isEmpty)
    XCTAssertNil(MadarStore(defaults: defaults).storageError)
  }

  func testWrongVersionAndDuplicateHistoryAreRejected() throws {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let key = "madar.demo.state.v1"
    defaults.set(Data("{\"version\":99}".utf8), forKey: key)
    XCTAssertNotNil(MadarStore(defaults: defaults).storageError)
    let valid = MadarStore(defaults: defaults)
    valid.resetDemo()
    _ = valid.simulate(.transport, kind: .date)
    let data = defaults.data(forKey: key)!
    var object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    let rawUpdates = try XCTUnwrap(object["updates"])
    var updates: [String: [[String: Any]]]
    if let dictionary = rawUpdates as? [String: [[String: Any]]] {
      updates = dictionary
    } else {
      let pairs = try XCTUnwrap(rawUpdates as? [Any])
      XCTAssertEqual(pairs.count, 2)
      updates = ["transport": try XCTUnwrap(pairs[1] as? [[String: Any]])]
    }
    let history = try XCTUnwrap(updates["transport"])
    updates["transport"] = [history[0], history[0]]
    object["updates"] = updates
    let duplicateBytes = try JSONSerialization.data(withJSONObject: object)
    defaults.set(duplicateBytes, forKey: key)
    let rejected = MadarStore(defaults: defaults)
    XCTAssertNotNil(rejected.storageError)
    XCTAssertEqual(defaults.data(forKey: key), duplicateBytes)
  }

  func testStoryIsolationAndUnfollowPreventsReplayNotice() {
    let (defaults, suite) = defaults()
    defer { clean(suite) }
    let store = MadarStore(defaults: defaults)
    store.follow(.transport, kind: .price)
    XCTAssertEqual(store.simulate(.training, kind: .price), .updated)
    XCTAssertTrue(store.notices.isEmpty)
    store.unfollow(.transport)
    XCTAssertEqual(store.simulate(.transport, kind: .price), .updated)
    XCTAssertTrue(store.notices.isEmpty)
    XCTAssertEqual(store.simulateDuplicate(.transport), .duplicate)
    XCTAssertEqual(store.updates(for: .transport).count, 1)
    XCTAssertEqual(store.updates(for: .training).count, 1)
  }
}
