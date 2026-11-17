import Combine
import Foundation

private struct PersistedState: Codable {
  var version = 1
  var bookmarks: [StoryID] = []
  var follows: [StoryID: ChangeKind] = [:]
  var updates: [StoryID: [StoryUpdate]] = [:]
  var readStories: [StoryID] = []
  var notices: [InAppNotice] = []
}

@MainActor public final class MadarStore: ObservableObject {
  private let defaults: UserDefaults
  private let storageKey = "madar.demo.state.v1"
  private var state = PersistedState()
  @Published public private(set) var bookmarks: Set<StoryID> = []
  @Published public private(set) var follows: [StoryID: ChangeKind] = [:]
  @Published public private(set) var notices: [InAppNotice] = []
  @Published public private(set) var storageError: String?
  public let stories = DemoCatalog.stories

  public init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    guard let data = defaults.data(forKey: storageKey) else { return }
    do {
      let decoded = try JSONDecoder().decode(PersistedState.self, from: data)
      let allUpdates = decoded.updates.values.flatMap { $0 }
      let updatesByID = Dictionary(grouping: allUpdates, by: \.id)
      guard decoded.version == 1,
        decoded.bookmarks.allSatisfy({ StoryID.allCases.contains($0) }),
        decoded.follows.allSatisfy({ StoryID.allCases.contains($0.key) }),
        decoded.updates.allSatisfy({ key, values in
          StoryID.allCases.contains(key)
            && values.allSatisfy({
              $0.storyID == key && $0 == DemoCatalog.update(storyID: key, kind: $0.kind)
            })
        }),
        updatesByID.values.allSatisfy({ $0.count == 1 }),
        decoded.readStories.allSatisfy({ StoryID.allCases.contains($0) }),
        decoded.notices.allSatisfy({ notice in
          guard let update = allUpdates.first(where: { $0.id == notice.id }) else { return false }
          return notice.storyID == update.storyID && notice.title == update.headline
            && notice.body == "تطور افتراضي يطابق متابعتك."
        }),
        Set(decoded.notices.map(\.id)).count == decoded.notices.count
      else {
        throw StorageFailure.invalid
      }
      state = decoded
      publish()
    } catch {
      storageError = "تعذر قراءة الحالة المحفوظة. بقيت البيانات كما هي؛ أعد ضبط التجربة لحذفها."
    }
  }

  public func story(_ id: StoryID) -> Story { DemoCatalog.story(id) }
  public func updates(for id: StoryID) -> [StoryUpdate] { state.updates[id] ?? [] }
  public func currentHeadline(for id: StoryID) -> String {
    updates(for: id).last?.headline ?? story(id).initialHeadline
  }
  public func currentSummary(for id: StoryID) -> String {
    updates(for: id).last?.summary ?? story(id).initialSummary
  }
  public func knownFacts(for id: StoryID) -> [String] {
    let initialKind: ChangeKind = id == .transport ? .date : .launch
    var byKind: [ChangeKind: String] = [initialKind: story(id).initialKnown]
    for update in updates(for: id) { byKind[update.kind] = update.known }
    return ChangeKind.allCases.compactMap { byKind[$0] }
  }
  public func unknownFact(for id: StoryID) -> String? {
    guard !updates(for: id).contains(where: \.resolvesUnknown) else { return nil }
    return story(id).initialUnknown
  }
  public func isUnread(_ id: StoryID) -> Bool { !state.readStories.contains(id) }
  public var unreadCount: Int { StoryID.allCases.filter(isUnread).count }

  public func markRead(_ id: StoryID) {
    guard storageError == nil else { return }
    if !state.readStories.contains(id) {
      state.readStories.append(id)
      persist()
    }
  }
  public func toggleBookmark(_ id: StoryID) {
    guard storageError == nil else { return }
    if state.bookmarks.contains(id) {
      state.bookmarks.removeAll { $0 == id }
    } else {
      state.bookmarks.append(id)
    }
    persist()
  }
  public func follow(_ id: StoryID, kind: ChangeKind) {
    guard storageError == nil else { return }
    state.follows[id] = kind
    persist()
  }
  public func unfollow(_ id: StoryID) {
    guard storageError == nil else { return }
    state.follows.removeValue(forKey: id)
    persist()
  }

  @discardableResult public func simulate(_ id: StoryID, kind: ChangeKind) -> SimulationResult {
    guard storageError == nil else { return .duplicate }
    return apply(DemoCatalog.update(storyID: id, kind: kind))
  }

  private func apply(_ update: StoryUpdate) -> SimulationResult {
    let id = update.storyID
    let kind = update.kind
    if updates(for: id).contains(where: { $0.id == update.id }) { return .duplicate }
    state.updates[id, default: []].append(update)
    state.readStories.removeAll { $0 == id }
    let result: SimulationResult
    if state.follows[id] == kind {
      state.notices.append(
        InAppNotice(
          id: update.id, storyID: id, title: update.headline, body: "تطور افتراضي يطابق متابعتك."))
      result = .notified
    } else {
      result = .updated
    }
    persist()
    return result
  }
  @discardableResult public func simulateDuplicate(_ id: StoryID) -> SimulationResult {
    guard storageError == nil, let latest = updates(for: id).last else { return .duplicate }
    return apply(latest)
  }
  public func resetDemo() {
    state = PersistedState()
    storageError = nil
    persist()
  }

  private func publish() {
    bookmarks = Set(state.bookmarks)
    follows = state.follows
    notices = state.notices
  }
  private func persist() {
    do {
      let data = try JSONEncoder().encode(state)
      defaults.set(data, forKey: storageKey)
      storageError = nil
      publish()
    } catch { storageError = "تعذر حفظ الحالة المحلية." }
  }
}

private enum StorageFailure: Error { case invalid }
