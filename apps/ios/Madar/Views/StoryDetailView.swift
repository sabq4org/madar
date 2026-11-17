import MadarCore
import SwiftUI

struct StoryDetailView: View {
  @EnvironmentObject private var store: MadarStore
  @Environment(\.dismiss) private var dismiss
  let storyID: StoryID
  @State private var tab: DetailTab = .changes
  @State private var showingFollow = false
  @State private var showingSource: SourceEvidence?
  @State private var selectedUpdate: StoryUpdate?

  private var story: Story { store.story(storyID) }
  private var updates: [StoryUpdate] { store.updates(for: storyID) }

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        Button {
          dismiss()
        } label: {
          Image(systemName: "chevron.right").frame(width: 44, height: 44).contentShape(Rectangle())
        }
        .accessibilityLabel("رجوع")
        Spacer()
        Text("ملف القصة").font(MadarDesign.font(16, weight: .bold)).foregroundStyle(MadarDesign.ink)
        Spacer()
        Button {
          store.toggleBookmark(storyID)
        } label: {
          Image(systemName: store.bookmarks.contains(storyID) ? "bookmark.fill" : "bookmark")
            .foregroundStyle(store.bookmarks.contains(storyID) ? MadarDesign.blue : MadarDesign.ink)
            .frame(width: 44, height: 44).contentShape(Rectangle())
        }.accessibilityLabel(store.bookmarks.contains(storyID) ? "إزالة من المحفوظات" : "حفظ القصة")
          .accessibilityIdentifier("story.save").accessibilityAddTraits(
            store.bookmarks.contains(storyID) ? .isSelected : []
          )
          .disabled(store.storageError != nil)
      }.padding(.horizontal, 14).frame(minHeight: 52)
      ScrollView {
        VStack(alignment: .leading, spacing: 17) {
          detailHeading
          HStack(spacing: 0) {
            ForEach(DetailTab.allCases) { item in
              Button {
                tab = item
              } label: {
                Text(item.title).font(MadarDesign.font(13, weight: tab == item ? .bold : .medium))
                  .foregroundStyle(tab == item ? .white : MadarDesign.muted)
                  .frame(maxWidth: .infinity, minHeight: 44)
                  .background(
                    tab == item ? MadarDesign.blue : .clear, in: RoundedRectangle(cornerRadius: 11)
                  )
                  .contentShape(Rectangle())
              }.buttonStyle(.plain)
                .accessibilityIdentifier(item == .changes ? "story.changes" : "story.sources")
                .accessibilityAddTraits(tab == item ? .isSelected : [])
            }
          }.padding(4).background(
            Color(red: 0.95, green: 0.96, blue: 0.98), in: RoundedRectangle(cornerRadius: 15))
          if tab == .changes { changesContent } else { sourcesContent }
        }.padding(.horizontal, 20).padding(.top, 12).padding(.bottom, 24)
      }
      VStack(spacing: 6) {
        Button {
          showingFollow = true
        } label: {
          Label(
            store.follows[storyID] == nil ? "تابع تطورًا محددًا" : "تعديل المتابعة",
            systemImage: "bell.badge")
        }.buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("story.follow")
        Text("التجربة محلية ولا ترسل إشعارات فعلية.").font(MadarDesign.font(11)).foregroundStyle(
          MadarDesign.muted)
      }.padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 6).background(.white)
    }
    .background(.white).toolbar(.hidden, for: .navigationBar)
    .onAppear { store.markRead(storyID) }
    .sheet(isPresented: $showingFollow) { FollowSheet(storyID: storyID).environmentObject(store) }
    .sheet(item: $showingSource) { source in SourceSheet(source: source) }
    .sheet(item: $selectedUpdate) { update in UpdateSheet(update: update) }
  }

  private var detailHeading: some View {
    VStack(alignment: .leading, spacing: 10) {
      Label(story.category, systemImage: story.symbol).font(MadarDesign.font(13, weight: .medium))
        .foregroundStyle(MadarDesign.blue)
      Text(story.title).font(MadarDesign.font(25, weight: .bold, relativeTo: .title))
        .foregroundStyle(MadarDesign.ink).fixedSize(horizontal: false, vertical: true)
      HStack(spacing: 12) {
        Label("قصة افتراضية", systemImage: "sparkle")
        Text("\(story.sources.count) مصادر")
      }.font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
      Text("جميع الأسماء والمواد في هذه الشاشة افتراضية لأغراض شرح التجربة.")
        .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted).padding(11).frame(
          maxWidth: .infinity, alignment: .leading
        )
        .background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 12))
    }.frame(maxWidth: .infinity, alignment: .leading)
  }

  private var changesContent: some View {
    VStack(alignment: .leading, spacing: 16) {
      Label(updates.isEmpty ? "بداية القصة" : "تسلسل تطورات الملف", systemImage: "sparkle")
        .font(MadarDesign.font(13, weight: .medium)).foregroundStyle(MadarDesign.blue)
      if updates.isEmpty {
        timelineRow(label: "سابقًا في القصة", title: story.previousSummary, isLatest: false)
        timelineRow(
          label: "الحالة الحالية", title: story.initialHeadline, isLatest: true,
          summary: story.initialSummary)
      } else {
        timelineRow(
          label: "البداية", title: story.initialHeadline, isLatest: false,
          summary: story.initialSummary)
        ForEach(updates) { update in
          Button {
            selectedUpdate = update
          } label: {
            timelineRow(
              label: "تحديث افتراضي", title: update.headline, isLatest: true,
              summary: update.summary)
          }.buttonStyle(.plain)
        }
      }
      VStack(alignment: .leading, spacing: 12) {
        Text("ما نعرفه الآن").font(MadarDesign.font(17, weight: .bold)).foregroundStyle(
          MadarDesign.ink)
        ForEach(Array(store.knownFacts(for: storyID).enumerated()), id: \.offset) { _, fact in
          factRow(fact, known: true)
        }
        if let unknown = store.unknownFact(for: storyID) { factRow(unknown, known: false) }
      }.padding(16).background(.white, in: RoundedRectangle(cornerRadius: 17)).overlay(
        RoundedRectangle(cornerRadius: 17).stroke(MadarDesign.divider))
      Text("هذه أدلة توضيحية، وليست وثائق إخبارية منشورة.")
        .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted).fixedSize(
          horizontal: false, vertical: true)
    }
  }

  private func timelineRow(label: String, title: String, isLatest: Bool, summary: String? = nil)
    -> some View
  {
    HStack(alignment: .top, spacing: 12) {
      VStack(spacing: 0) {
        Circle().fill(isLatest ? MadarDesign.blue : MadarDesign.divider).frame(
          width: 10, height: 10)
        Rectangle().fill(MadarDesign.divider).frame(width: 1, height: 50)
      }.padding(.top, 5)
      VStack(alignment: .leading, spacing: 5) {
        Text(label).font(MadarDesign.font(11)).foregroundStyle(MadarDesign.muted)
        Text(title).font(MadarDesign.font(15, weight: .bold)).foregroundStyle(MadarDesign.ink)
        if let summary {
          Text(summary).font(MadarDesign.font(13)).foregroundStyle(MadarDesign.muted).fixedSize(
            horizontal: false, vertical: true)
        }
      }.frame(maxWidth: .infinity, alignment: .leading).padding(13)
        .background(
          isLatest ? MadarDesign.paleBlue : Color.white, in: RoundedRectangle(cornerRadius: 14))
    }
  }

  private func factRow(_ text: String, known: Bool) -> some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: known ? "checkmark.shield" : "info.circle").foregroundStyle(
        known ? MadarDesign.blue : MadarDesign.muted
      ).frame(width: 20)
      VStack(alignment: .leading, spacing: 3) {
        Text(text).font(MadarDesign.font(14, weight: .medium)).foregroundStyle(MadarDesign.ink)
        Text(known ? "مذكور ضمن مادة افتراضية" : "لا تتوفر إجابة في المثال الحالي").font(
          MadarDesign.font(11)
        ).foregroundStyle(MadarDesign.muted)
      }.frame(maxWidth: .infinity, alignment: .leading)
    }.frame(minHeight: 44, alignment: .center)
  }

  private var sourcesContent: some View {
    VStack(alignment: .leading, spacing: 13) {
      Text("الأدلة والمصادر").font(MadarDesign.font(18, weight: .bold)).foregroundStyle(
        MadarDesign.ink)
      Text("هذه بطاقات توضيحية خيالية، ولا تمثل مصادر منشورة أو تأكيدات مستقلة.")
        .font(MadarDesign.font(13)).foregroundStyle(MadarDesign.muted).fixedSize(
          horizontal: false, vertical: true)
      ForEach(story.sources) { source in
        Button {
          showingSource = source
        } label: {
          VStack(alignment: .leading, spacing: 9) {
            HStack {
              Text(source.name).font(MadarDesign.font(15, weight: .bold)).foregroundStyle(
                MadarDesign.ink)
              Spacer()
              Image(systemName: "chevron.left").foregroundStyle(MadarDesign.muted)
            }
            Text(source.detail).font(MadarDesign.font(13)).foregroundStyle(MadarDesign.ink).frame(
              maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 5) {
              Image(systemName: source.isPrimary ? "building.2" : "doc.text")
              Text(source.isPrimary ? "إعلان افتراضي من الجهة" : "سياق افتراضي · لا تأكيد جديد")
            }
            .font(MadarDesign.font(11)).foregroundStyle(MadarDesign.muted)
          }.padding(15).background(.white, in: RoundedRectangle(cornerRadius: 16)).overlay(
            RoundedRectangle(cornerRadius: 16).stroke(MadarDesign.divider))
        }.buttonStyle(.plain)
      }
      Text("المصدر المنقول عنه لا يساوي تأكيدًا مستقلًا. حقوق المحتوى: \(story.rightsPolicy)")
        .font(MadarDesign.font(11)).foregroundStyle(MadarDesign.muted).fixedSize(
          horizontal: false, vertical: true
        ).padding(.top, 4)
    }
  }
}

private enum DetailTab: String, CaseIterable, Identifiable {
  case changes, sources
  var id: String { rawValue }
  var title: String { self == .changes ? "ما تغيّر" : "الأدلة والمصادر" }
}

private struct SourceSheet: View {
  let source: SourceEvidence
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    VStack(alignment: .leading, spacing: 15) {
      HStack {
        Text(source.name).font(MadarDesign.font(20, weight: .bold)).foregroundStyle(MadarDesign.ink)
        Spacer()
        Button("إغلاق") { dismiss() }.frame(minWidth: 44, minHeight: 44)
      }
      FictionBadge()
      Text(source.detail).font(MadarDesign.font(16)).foregroundStyle(MadarDesign.ink)
      Text("النسبة: \(source.provenance)").font(MadarDesign.font(13)).foregroundStyle(
        MadarDesign.muted)
      Text("سياسة الحقوق: \(source.rightsPolicy)").font(MadarDesign.font(13)).foregroundStyle(
        MadarDesign.muted)
      Spacer()
    }.padding(22).presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
  }
}

private struct UpdateSheet: View {
  let update: StoryUpdate
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        Text(update.headline).font(MadarDesign.font(20, weight: .bold)).foregroundStyle(
          MadarDesign.ink)
        Spacer()
        Button("إغلاق") { dismiss() }.frame(minWidth: 44, minHeight: 44)
      }
      FictionBadge()
      Text(update.summary).font(MadarDesign.font(15)).foregroundStyle(MadarDesign.ink)
      Text("المصدر: \(update.provenance) · حقوق المحتوى: \(update.rightsPolicy)").font(
        MadarDesign.font(12)
      ).foregroundStyle(MadarDesign.muted)
      Spacer()
    }.padding(22).presentationDetents([.medium, .large]).presentationDragIndicator(.visible)
  }
}
