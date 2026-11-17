import MadarCore
import SwiftUI

struct FollowSheet: View {
  @EnvironmentObject private var store: MadarStore
  @Environment(\.dismiss) private var dismiss
  let storyID: StoryID
  @State private var choice: ChangeKind = .date
  @State private var didSave = false

  private var story: Story { store.story(storyID) }

  var body: some View {
    VStack(spacing: 0) {
      ScrollView {
        VStack(alignment: .leading, spacing: 17) {
          HStack {
            Spacer()
            Button {
              dismiss()
            } label: {
              Image(systemName: "xmark").frame(width: 44, height: 44).background(
                Color.black.opacity(0.045), in: Circle())
            }.accessibilityLabel("إغلاق")
          }
          VStack(spacing: 9) {
            Image(systemName: "bell.badge").font(.system(size: 23)).foregroundStyle(
              MadarDesign.blue
            )
            .frame(width: 58, height: 58).background(MadarDesign.paleBlue, in: Circle())
            Text(didSave ? "تم حفظ متابعتك." : "أخبرني حين يهمّني.").font(
              MadarDesign.font(23, weight: .bold, relativeTo: .title2)
            ).foregroundStyle(MadarDesign.ink)
            Text("اختر التطوّر الذي تنتظره.\nلن نكرر التنبيهات عند تكرار التغطية.")
              .font(MadarDesign.font(14)).foregroundStyle(MadarDesign.muted).multilineTextAlignment(
                .center)
          }.frame(maxWidth: .infinity)
          HStack(spacing: 12) {
            Image(systemName: story.symbol).foregroundStyle(MadarDesign.blue).frame(
              width: 42, height: 42
            ).background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 13))
            VStack(alignment: .leading, spacing: 3) {
              Text(story.title).font(MadarDesign.font(15, weight: .bold)).foregroundStyle(
                MadarDesign.ink)
              Text("ملف افتراضي لمتابعة تطوره").font(MadarDesign.font(12)).foregroundStyle(
                MadarDesign.muted)
            }
            Spacer()
          }.padding(13).background(.white, in: RoundedRectangle(cornerRadius: 15)).overlay(
            RoundedRectangle(cornerRadius: 15).stroke(MadarDesign.divider))
          Text("نبّهني عند").font(MadarDesign.font(16, weight: .bold)).foregroundStyle(
            MadarDesign.ink)
          if store.storageError != nil {
            Text("تعذر حفظ التغييرات. افتح المحاكي وأعد ضبط الحالة للمتابعة.")
              .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
              .frame(maxWidth: .infinity, alignment: .leading).padding(11)
              .background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 12))
          }
          VStack(spacing: 9) {
            ForEach(story.options) { option in optionRow(option) }
          }
          preview
          Text("تُحفظ المتابعة على هذا الجهاز فقط. لا تُرسل إشعارات فعلية.")
            .font(MadarDesign.font(11)).foregroundStyle(MadarDesign.muted).frame(
              maxWidth: .infinity, alignment: .center)
        }.padding(.horizontal, 21).padding(.top, 6).padding(.bottom, 18)
      }
      VStack(spacing: 8) {
        Button {
          store.follow(storyID, kind: choice)
          didSave = true
        } label: {
          Label(
            didSave ? "المتابعة محفوظة" : "حفظ المتابعة",
            systemImage: didSave ? "checkmark" : "bell.badge")
        }
        .buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("follow.save")
        .disabled(store.storageError != nil)
        if store.follows[storyID] != nil {
          Button("إزالة المتابعة") {
            store.unfollow(storyID)
            dismiss()
          }
          .font(MadarDesign.font(14, weight: .medium)).foregroundStyle(MadarDesign.muted).frame(
            maxWidth: .infinity, minHeight: 44
          )
          .accessibilityIdentifier("follow.remove")
          .disabled(store.storageError != nil)
        }
      }.padding(.horizontal, 20).padding(.top, 10).padding(.bottom, 8).background(.white)
    }
    .background(.white).presentationDetents([.large]).presentationDragIndicator(.visible)
    .onAppear { choice = store.follows[storyID] ?? story.options.first?.id ?? .date }
  }

  private func optionRow(_ option: FollowOption) -> some View {
    let selected = choice == option.id
    return Button {
      choice = option.id
      didSave = false
    } label: {
      HStack(spacing: 12) {
        Image(systemName: selected ? "largecircle.fill.circle" : "circle")
          .font(.system(size: 21)).foregroundStyle(selected ? MadarDesign.blue : MadarDesign.muted)
        VStack(alignment: .leading, spacing: 4) {
          Text(option.title).font(MadarDesign.font(14, weight: .bold)).foregroundStyle(
            MadarDesign.ink)
          Text(option.subtitle).font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
            .fixedSize(horizontal: false, vertical: true)
        }
        Spacer(minLength: 0)
      }.padding(13).frame(minHeight: 66).background(
        selected ? MadarDesign.paleBlue : .white, in: RoundedRectangle(cornerRadius: 15)
      )
      .overlay(
        RoundedRectangle(cornerRadius: 15).stroke(
          selected ? MadarDesign.blue.opacity(0.35) : MadarDesign.divider)
      )
      .contentShape(Rectangle())
    }.buttonStyle(.plain).accessibilityIdentifier("follow.\(option.id.rawValue)")
      .accessibilityLabel("\(option.title). \(option.subtitle)")
      .accessibilityAddTraits(selected ? .isSelected : [])
  }

  private var preview: some View {
    VStack(alignment: .leading, spacing: 9) {
      HStack {
        Text("هكذا سيبدو التنبيه").font(MadarDesign.font(12, weight: .medium))
        Spacer()
        Text("معاينة افتراضية").font(MadarDesign.font(11))
      }
      .foregroundStyle(MadarDesign.muted)
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Label("مدار", systemImage: "circle.hexagongrid").font(MadarDesign.font(13, weight: .bold))
          Spacer()
          Text("معاينة").font(MadarDesign.font(11))
        }
        .foregroundStyle(MadarDesign.blue)
        Text("\(optionFor(choice)?.title ?? "تطوّر جديد") في \(story.title)")
          .font(MadarDesign.font(14, weight: .bold)).foregroundStyle(MadarDesign.ink)
        Text("سنخبرك إذا ظهر هذا التطوّر في مواد القصة التجريبية.")
          .font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
      }.padding(14).background(MadarDesign.paleBlue, in: RoundedRectangle(cornerRadius: 15))
    }
  }

  private func optionFor(_ id: ChangeKind) -> FollowOption? { story.options.first { $0.id == id } }
}
