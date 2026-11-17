import MadarCore
import SwiftUI

struct DemoSimulatorView: View {
  @EnvironmentObject private var store: MadarStore
  @Environment(\.dismiss) private var dismiss
  @State private var storyID: StoryID = .transport
  @State private var kind: ChangeKind = .date
  @State private var resultText = "اختر سيناريو لتجربة تحديث الملف."
  @State private var resultKind: SimulationResult?
  @State private var confirmReset = false

  private var story: Story { store.story(storyID) }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          FictionBadge()
          VStack(alignment: .leading, spacing: 6) {
            Text("محاكي النسخة التجريبية").font(
              MadarDesign.font(25, weight: .bold, relativeTo: .title)
            ).foregroundStyle(MadarDesign.ink)
            Text("كل النتائج محلية وخيالية. لا يوجد اتصال بمصادر أو إرسال إشعارات.").font(
              MadarDesign.font(13)
            ).foregroundStyle(MadarDesign.muted).fixedSize(horizontal: false, vertical: true)
          }
          Text("اختر ملفًا").font(MadarDesign.font(16, weight: .bold)).foregroundStyle(
            MadarDesign.ink)
          HStack(spacing: 10) {
            ForEach(store.stories) { item in
              Button {
                storyID = item.id
                resultKind = nil
              } label: {
                Text(item.title).font(MadarDesign.font(13, weight: .bold)).foregroundStyle(
                  storyID == item.id ? .white : MadarDesign.ink
                )
                .frame(maxWidth: .infinity, minHeight: 52).padding(.horizontal, 6)
                .background(
                  storyID == item.id ? MadarDesign.blue : MadarDesign.paleBlue,
                  in: RoundedRectangle(cornerRadius: 13))
              }.buttonStyle(.plain).accessibilityIdentifier(
                item.id == .transport ? "demo.story.transport" : "demo.story.training"
              )
              .accessibilityAddTraits(storyID == item.id ? .isSelected : [])
            }
          }
          Text("حاكي تطورًا").font(MadarDesign.font(16, weight: .bold)).foregroundStyle(
            MadarDesign.ink)
          VStack(spacing: 8) {
            ForEach(story.options) { option in
              Button {
                kind = option.id
                resultKind = nil
              } label: {
                HStack(spacing: 11) {
                  Image(systemName: kind == option.id ? "largecircle.fill.circle" : "circle")
                    .foregroundStyle(kind == option.id ? MadarDesign.blue : MadarDesign.muted)
                  VStack(alignment: .leading, spacing: 3) {
                    Text(option.title).font(MadarDesign.font(14, weight: .bold)).foregroundStyle(
                      MadarDesign.ink)
                    Text(option.subtitle).font(MadarDesign.font(12)).foregroundStyle(
                      MadarDesign.muted)
                  }
                  Spacer()
                }.padding(12).frame(minHeight: 58).background(
                  kind == option.id ? MadarDesign.paleBlue : .white,
                  in: RoundedRectangle(cornerRadius: 13)
                )
                .overlay(
                  RoundedRectangle(cornerRadius: 13).stroke(
                    kind == option.id ? MadarDesign.blue.opacity(0.35) : MadarDesign.divider))
              }.buttonStyle(.plain).accessibilityIdentifier("demo.\(option.id.rawValue)")
                .accessibilityAddTraits(kind == option.id ? .isSelected : [])
            }
          }
          Button {
            applySimulation()
          } label: {
            Label("تطبيق السيناريو", systemImage: "play.fill")
          }
          .buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("demo.apply")
          .disabled(store.storageError != nil)
          Button {
            let value = store.simulateDuplicate(storyID)
            show(value)
          } label: {
            Label("إعادة نشر الخبر نفسه", systemImage: "arrow.clockwise")
          }
          .font(MadarDesign.font(14, weight: .bold)).foregroundStyle(MadarDesign.blue).frame(
            maxWidth: .infinity, minHeight: 48
          )
          .accessibilityIdentifier("demo.duplicate")
          .disabled(store.storageError != nil)
          if store.storageError != nil {
            Text("الحالة المحفوظة غير صالحة؛ لا تغييرات ممكنة حتى إعادة الضبط.")
              .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
              .frame(maxWidth: .infinity, alignment: .leading).padding(11)
              .background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 12))
          }
          if let resultKind { resultPanel(resultKind) }
          if !store.notices.isEmpty {
            VStack(alignment: .leading, spacing: 9) {
              Text("التنبيهات داخل التطبيق").font(MadarDesign.font(16, weight: .bold))
                .foregroundStyle(MadarDesign.ink)
              ForEach(store.notices.reversed()) { notice in
                VStack(alignment: .leading, spacing: 5) {
                  Label(notice.title, systemImage: "bell.badge").font(
                    MadarDesign.font(14, weight: .bold)
                  ).foregroundStyle(MadarDesign.ink)
                  Text(notice.body).font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
                }.frame(maxWidth: .infinity, alignment: .leading).padding(13).background(
                  MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 13))
              }
            }
          }
          Button("إعادة التجربة إلى البداية", role: .destructive) { confirmReset = true }
            .font(MadarDesign.font(14, weight: .medium)).frame(maxWidth: .infinity, minHeight: 48)
            .accessibilityIdentifier("demo.reset")
        }.padding(20).padding(.bottom, 16)
      }
      .background(.white)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("إغلاق") { dismiss() }.accessibilityIdentifier("demo.close")
        }
      }
      .navigationTitle("المحاكي").navigationBarTitleDisplayMode(.inline)
    }
    .tint(MadarDesign.blue)
    .confirmationDialog("إعادة التجربة؟", isPresented: $confirmReset, titleVisibility: .visible) {
      Button("إعادة كل بيانات التجربة", role: .destructive) {
        store.resetDemo()
        resultKind = nil
        resultText = "عادت التجربة إلى البداية. كل القصص والمصادر افتراضية."
      }
      Button("إلغاء", role: .cancel) {}
    } message: {
      Text("سيُحذف سجل المتابعة والمحفوظات والنسخ التجريبية من هذا التطبيق فقط.")
    }
    .onChange(of: storyID) { _, newValue in
      kind = store.story(newValue).options.first?.id ?? .date
    }
  }

  private func applySimulation() {
    let value = store.simulate(storyID, kind: kind)
    show(value)
  }

  private func show(_ value: SimulationResult) {
    resultKind = value
    switch value {
    case .notified: resultText = "تطوّر جديد يطابق شرطك؛ تحدّث الملف ووصل تنبيه تجريبي داخل التطبيق."
    case .updated: resultText = "تحدّث الملف، لكن التطور لا يطابق شرطك المحفوظ؛ لم يصلك تنبيه."
    case .duplicate:
      resultText = "تكرّرت المادة دون معلومة جديدة. لم يتغير الملف ولم يصل تنبيه جديد."
    }
  }

  private func resultPanel(_ kind: SimulationResult) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Label(
        kind == .notified ? "تطوّر مطابق" : kind == .updated ? "تحديث في الملف" : "مادة مكررة",
        systemImage: kind == .notified
          ? "bell.badge.fill" : kind == .updated ? "arrow.clockwise" : "checkmark.circle"
      )
      .font(MadarDesign.font(15, weight: .bold)).foregroundStyle(MadarDesign.ink)
      Text(resultText).font(MadarDesign.font(13)).foregroundStyle(MadarDesign.muted)
    }.frame(maxWidth: .infinity, alignment: .leading).padding(14)
      .background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 14))
      .accessibilityElement(children: .combine).accessibilityIdentifier("demo.result")
  }
}
