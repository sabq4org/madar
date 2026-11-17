import MadarCore
import SwiftUI

struct MadarRootView: View {
  @EnvironmentObject private var store: MadarStore
  @State private var tab: MainTab = .today
  @State private var selectedStory: StoryID?
  @State private var showingDemo = false
  @State private var dismissedStorageError = false

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        if let error = store.storageError, !dismissedStorageError {
          storageErrorBanner(error)
        }
        Group {
          switch tab {
          case .today: today
          case .files: files
          case .saved: saved
          }
        }
      }
      .background(MadarDesign.canvas)
      .toolbar(.hidden, for: .navigationBar)
      .safeAreaInset(edge: .top, spacing: 0) { header }
      .safeAreaInset(edge: .bottom, spacing: 0) { tabBar }
      .navigationDestination(item: $selectedStory) { id in StoryDetailView(storyID: id) }
      .sheet(isPresented: $showingDemo) { DemoSimulatorView().environmentObject(store) }
    }
    .tint(MadarDesign.blue)
    .font(MadarDesign.font(15))
    .background(.white)
  }

  private var header: some View {
    HStack {
      HStack(spacing: 9) {
        OrbitMark()
        Text("مدار").font(MadarDesign.font(22, weight: .bold, relativeTo: .title2)).foregroundStyle(
          MadarDesign.ink)
      }
      Spacer()
      Button {
        showingDemo = true
      } label: {
        Image(systemName: "flask").font(.system(size: 17, weight: .medium)).foregroundStyle(
          MadarDesign.muted
        )
        .frame(width: 44, height: 44).contentShape(Rectangle())
      }.accessibilityLabel("فتح محاكي النسخة التجريبية").accessibilityIdentifier("demo.open")
    }.padding(.horizontal, 20).frame(minHeight: 54).background(.white)
  }

  private var today: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 15) {
        FictionBadge()
        VStack(alignment: .leading, spacing: 4) {
          Text("اليوم في التجربة").font(MadarDesign.font(13)).foregroundStyle(MadarDesign.muted)
          Text("أنت على اطّلاع.").font(MadarDesign.font(27, weight: .bold, relativeTo: .largeTitle))
            .foregroundStyle(MadarDesign.ink)
          Text(unreadSummary).font(MadarDesign.font(15)).foregroundStyle(MadarDesign.muted)
        }.padding(.top, 2)
        SectionHeading(title: "قصص اليوم")
        storyCard(.transport, featured: true)
        storyCard(.training, featured: false)
        Button {
          tab = .files
        } label: {
          HStack(spacing: 11) {
            Image(systemName: "square.stack.3d.up").foregroundStyle(MadarDesign.blue)
            VStack(alignment: .leading, spacing: 2) {
              Text("ملفات المتابعة").font(MadarDesign.font(14, weight: .bold)).foregroundStyle(
                MadarDesign.ink)
              Text(
                store.follows.isEmpty
                  ? "لم تحفظ متابعة بعد"
                  : store.follows.count == 1 ? "تتابع ملفًا واحدًا" : "تتابع ملفين"
              ).font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
            }
            Spacer()
            Image(systemName: "chevron.left").foregroundStyle(MadarDesign.muted)
          }.padding(14).frame(minHeight: 58).background(
            .white, in: RoundedRectangle(cornerRadius: 16)
          ).overlay(RoundedRectangle(cornerRadius: 16).stroke(MadarDesign.divider))
        }.buttonStyle(.plain)
        Label("أنت تختار ما تتابعه، ومتى يستحق تنبيهًا.", systemImage: "checkmark.circle")
          .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted).frame(maxWidth: .infinity)
          .padding(.vertical, 9)
      }.padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 20)
    }.accessibilityIdentifier("screen.today")
  }

  @ViewBuilder private func storyCard(_ id: StoryID, featured: Bool) -> some View {
    let story = store.story(id)
    let current = store.currentHeadline(for: id)
    Button {
      selectedStory = id
    } label: {
      VStack(alignment: .leading, spacing: 13) {
        HStack {
          Label(story.category, systemImage: story.symbol).font(
            MadarDesign.font(12, weight: .medium)
          ).foregroundStyle(featured ? MadarDesign.blue : MadarDesign.muted)
          Spacer()
          Text(store.isUnread(id) ? "جديد" : "قرأته").font(
            MadarDesign.font(11, weight: store.isUnread(id) ? .bold : .regular)
          ).foregroundStyle(store.isUnread(id) ? MadarDesign.blue : MadarDesign.muted)
        }
        Text(story.title).font(
          MadarDesign.font(
            featured ? 19 : 16, weight: .bold, relativeTo: featured ? .title3 : .headline)
        ).foregroundStyle(MadarDesign.ink).frame(maxWidth: .infinity, alignment: .leading)
        if featured {
          VStack(alignment: .leading, spacing: 4) {
            Text("ما الذي تغيّر؟").font(MadarDesign.font(11)).foregroundStyle(MadarDesign.muted)
            Text(current).font(MadarDesign.font(15, weight: .bold)).foregroundStyle(MadarDesign.ink)
          }
        } else {
          Text(current).font(MadarDesign.font(14)).foregroundStyle(MadarDesign.ink).frame(
            maxWidth: .infinity, alignment: .leading)
          Label("تحديث من الجهة المنظمة · خيالي", systemImage: "checkmark.seal").font(
            MadarDesign.font(11)
          ).foregroundStyle(MadarDesign.muted)
        }
        if featured {
          RouteIllustration().padding(.horizontal, 12).background(
            Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 12))
          HStack {
            Text("\(story.sources.count) مصادر، بينها إعلان الجهة")
            Spacer()
            Label("افتح الملف", systemImage: "chevron.left")
          }
          .font(MadarDesign.font(11, weight: .medium)).foregroundStyle(MadarDesign.muted)
        }
      }.padding(16).background(
        featured ? MadarDesign.paleBlue : .white, in: RoundedRectangle(cornerRadius: 19)
      )
      .overlay(
        RoundedRectangle(cornerRadius: 19).stroke(
          featured ? Color.clear : MadarDesign.divider, lineWidth: 1))
    }.buttonStyle(.plain).accessibilityIdentifier(
      id == .transport ? "story.transport" : "story.training")
  }

  private var files: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        intro(title: "ملفاتك المتابعة", detail: "نراقب التطورات التي اخترتها.")
        if store.follows.isEmpty {
          EmptyState(
            title: "لا تتابع ملفًا بعد",
            detail: "اختر تطورًا محددًا من أي قصة، وسنحدّث ملفك عند ظهوره في هذه التجربة.",
            actionTitle: "استكشف القصص"
          ) { tab = .today }
        } else {
          ForEach(store.stories.filter { store.follows[$0.id] != nil }) { story in
            Button {
              selectedStory = story.id
            } label: {
              VStack(alignment: .leading, spacing: 8) {
                Text(story.title).font(MadarDesign.font(17, weight: .bold)).foregroundStyle(
                  MadarDesign.ink)
                Text(store.currentHeadline(for: story.id)).font(MadarDesign.font(14))
                  .foregroundStyle(MadarDesign.ink)
                if let kind = store.follows[story.id],
                  let option = story.options.first(where: { $0.id == kind })
                {
                  Label(option.title, systemImage: "bell.badge").font(MadarDesign.font(12))
                    .foregroundStyle(MadarDesign.blue)
                }
              }.frame(maxWidth: .infinity, alignment: .leading).padding(16).background(
                .white, in: RoundedRectangle(cornerRadius: 17)
              ).overlay(RoundedRectangle(cornerRadius: 17).stroke(MadarDesign.divider))
            }.buttonStyle(.plain)
          }
        }
      }.padding(20)
    }.accessibilityIdentifier("screen.files")
  }

  private var saved: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        intro(title: "محفوظاتك", detail: "قصص اخترتها للعودة إليها.")
        let stories = store.stories.filter { store.bookmarks.contains($0.id) }
        if stories.isEmpty {
          EmptyState(
            title: "لم تحفظ قصة بعد", detail: "افتح أي قصة واضغط علامة الحفظ للعودة إليها هنا.",
            actionTitle: "استكشف القصص"
          ) { tab = .today }
        } else {
          ForEach(stories) { story in
            Button {
              selectedStory = story.id
            } label: {
              VStack(alignment: .leading, spacing: 8) {
                Text(story.title).font(MadarDesign.font(17, weight: .bold)).foregroundStyle(
                  MadarDesign.ink)
                Text(store.currentHeadline(for: story.id)).font(MadarDesign.font(14))
                  .foregroundStyle(MadarDesign.muted)
              }
              .frame(maxWidth: .infinity, alignment: .leading).padding(16).background(
                .white, in: RoundedRectangle(cornerRadius: 17)
              ).overlay(RoundedRectangle(cornerRadius: 17).stroke(MadarDesign.divider))
            }.buttonStyle(.plain)
          }
        }
      }.padding(20)
    }.accessibilityIdentifier("screen.saved")
  }

  private func intro(title: String, detail: String) -> some View {
    VStack(alignment: .leading, spacing: 7) {
      Text("مساحتك الخاصة").font(MadarDesign.font(13)).foregroundStyle(MadarDesign.muted)
      Text(title).font(MadarDesign.font(27, weight: .bold, relativeTo: .largeTitle))
        .foregroundStyle(MadarDesign.ink)
      Text(detail).font(MadarDesign.font(15)).foregroundStyle(MadarDesign.muted)
    }.padding(.bottom, 7)
  }

  private var unreadSummary: String {
    switch store.unreadCount {
    case 0: "قرأت كل التطورات في هذه التجربة."
    case 1: "ملف واحد فيه جديد لم تقرأه بعد."
    case 2: "ملفان فيهما جديد لم تقرأه بعد."
    default: "\(store.unreadCount) ملفات فيها جديد لم تقرأه بعد."
    }
  }

  private func storageErrorBanner(_ error: String) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .top, spacing: 9) {
        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
        Text(error).font(MadarDesign.font(12)).foregroundStyle(MadarDesign.ink).frame(
          maxWidth: .infinity, alignment: .leading)
        Button {
          dismissedStorageError = true
        } label: {
          Image(systemName: "xmark").frame(width: 44, height: 44).contentShape(Rectangle())
        }
        .accessibilityLabel("إخفاء رسالة الخطأ مرة واحدة")
      }
      Button("فتح المحاكي لإعادة ضبط الحالة") { showingDemo = true }
        .font(MadarDesign.font(12, weight: .bold)).foregroundStyle(MadarDesign.blue).frame(
          minHeight: 44, alignment: .leading)
    }.padding(.horizontal, 16).padding(.vertical, 10).background(Color.orange.opacity(0.08))
  }

  private var tabBar: some View {
    HStack(spacing: 0) {
      ForEach(MainTab.allCases) { item in
        Button {
          tab = item
        } label: {
          VStack(spacing: 4) {
            Image(systemName: item.symbol).font(
              .system(size: 18, weight: tab == item ? .semibold : .regular))
            Text(item.title).font(MadarDesign.font(11, weight: tab == item ? .bold : .regular))
          }.foregroundStyle(tab == item ? MadarDesign.blue : MadarDesign.muted).frame(
            maxWidth: .infinity, minHeight: 54
          )
          .contentShape(Rectangle())
        }.accessibilityIdentifier(item.accessibilityID).accessibilityAddTraits(
          tab == item ? .isSelected : [])
      }
    }.padding(.horizontal, 8).background(.white).overlay(alignment: .top) {
      Rectangle().fill(MadarDesign.divider).frame(height: 1)
    }
  }
}

private enum MainTab: String, CaseIterable, Identifiable {
  case today, files, saved
  var id: String { rawValue }
  var title: String {
    switch self {
    case .today: "اليوم"
    case .files: "ملفاتي"
    case .saved: "المحفوظات"
    }
  }
  var symbol: String {
    switch self {
    case .today: "house"
    case .files: "square.stack.3d.up"
    case .saved: "bookmark"
    }
  }
  var accessibilityID: String {
    switch self {
    case .today: "tab.today"
    case .files: "tab.files"
    case .saved: "tab.saved"
    }
  }
}
