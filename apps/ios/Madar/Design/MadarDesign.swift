import SwiftUI

enum MadarDesign {
  static let ink = Color(red: 23 / 255, green: 43 / 255, blue: 70 / 255)
  static let blue = Color(red: 36 / 255, green: 91 / 255, blue: 232 / 255)
  static let paleBlue = Color(red: 237 / 255, green: 243 / 255, blue: 255 / 255)
  static let muted = Color(red: 86 / 255, green: 107 / 255, blue: 135 / 255)
  static let divider = Color(red: 223 / 255, green: 231 / 255, blue: 241 / 255)
  static let canvas = Color.white
  static func font(
    _ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body
  ) -> Font {
    let name: String
    if [.semibold, .bold, .heavy, .black].contains(weight) {
      name = "IBMPlexSansArabic-Bold"
    } else if weight == .medium {
      name = "IBMPlexSansArabic-Medium"
    } else {
      name = "IBMPlexSansArabic-Regular"
    }
    return .custom(name, size: size, relativeTo: style)
  }
}

struct OrbitMark: View {
  var body: some View {
    GeometryReader { geometry in
      let size = min(geometry.size.width, geometry.size.height)
      ZStack {
        Path { path in
          path.addEllipse(in: CGRect(x: 9, y: 9, width: 6, height: 6))
          path.move(to: CGPoint(x: 4.6, y: 16.2))
          path.addCurve(
            to: CGPoint(x: 8, y: 4), control1: CGPoint(x: 1.9, y: 12.6),
            control2: CGPoint(x: 3.4, y: 6.4))
          path.addCurve(
            to: CGPoint(x: 20.2, y: 8.3), control1: CGPoint(x: 14.8, y: 3.7),
            control2: CGPoint(x: 18.9, y: 4.8))
          path.move(to: CGPoint(x: 19.5, y: 14.5))
          path.addCurve(
            to: CGPoint(x: 9.5, y: 20.2), control1: CGPoint(x: 18.8, y: 19.1),
            control2: CGPoint(x: 13.8, y: 21.8))
          path.move(to: CGPoint(x: 4.5, y: 19.5))
          path.addLine(to: CGPoint(x: 8, y: 16))
        }.stroke(
          MadarDesign.blue, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
        Circle().fill(MadarDesign.blue).frame(width: 3.2, height: 3.2).position(
          x: 19.5 / 24 * size, y: 12 / 24 * size)
      }.frame(width: size, height: size).scaleEffect(size / 24, anchor: .topLeading)
    }.frame(width: 25, height: 25).accessibilityHidden(true)
  }
}

struct BrandHeader: View {
  var trailing: AnyView? = nil
  var body: some View {
    HStack(spacing: 9) {
      OrbitMark()
      Text("مدار").font(MadarDesign.font(21, weight: .bold, relativeTo: .title2)).foregroundStyle(
        MadarDesign.ink)
      Spacer()
      if let trailing { trailing }
    }.frame(minHeight: 48).accessibilityElement(children: .combine)
  }
}

struct FictionBadge: View {
  var body: some View {
    Label("نسخة تجريبية · قصص افتراضية", systemImage: "sparkle")
      .font(MadarDesign.font(12, weight: .medium, relativeTo: .caption))
      .foregroundStyle(MadarDesign.muted).padding(.horizontal, 12).padding(.vertical, 8)
      .background(Color(red: 0.965, green: 0.975, blue: 0.992), in: Capsule())
  }
}

struct PrimaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.font(MadarDesign.font(16, weight: .bold)).foregroundStyle(.white)
      .frame(maxWidth: .infinity, minHeight: 52).background(
        MadarDesign.blue, in: RoundedRectangle(cornerRadius: 16)
      )
      .opacity(configuration.isPressed ? 0.86 : 1)
  }
}

struct RouteIllustration: View {
  var body: some View {
    GeometryReader { geo in
      let w = geo.size.width
      ZStack(alignment: .topTrailing) {
        Path { p in
          p.move(to: CGPoint(x: w * 0.02, y: 46))
          p.addLine(to: CGPoint(x: w * 0.35, y: 46))
          p.addCurve(
            to: CGPoint(x: w * 0.57, y: 19), control1: CGPoint(x: w * 0.42, y: 46),
            control2: CGPoint(x: w * 0.43, y: 19))
          p.addLine(to: CGPoint(x: w * 0.97, y: 19))
        }.stroke(MadarDesign.blue, style: StrokeStyle(lineWidth: 3, lineCap: .round))
        ForEach([0.15, 0.57, 0.87], id: \.self) { x in
          Circle().fill(MadarDesign.blue).frame(width: 8, height: 8).position(
            x: w * x, y: x < 0.3 ? 46 : 19)
        }
        Text("المطار").font(MadarDesign.font(11, weight: .medium, relativeTo: .caption))
          .foregroundStyle(MadarDesign.blue).offset(y: 35)
      }
    }.frame(height: 65).background(
      Color.white.opacity(0.75), in: RoundedRectangle(cornerRadius: 12)
    ).accessibilityHidden(true)
  }
}

struct SectionHeading: View {
  let title: String
  var trailing: String? = nil
  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(title).font(MadarDesign.font(16, weight: .bold)).foregroundStyle(MadarDesign.ink)
      Spacer()
      if let trailing {
        Text(trailing).font(MadarDesign.font(12)).foregroundStyle(MadarDesign.muted)
      }
    }.padding(.vertical, 7)
  }
}

struct EmptyState: View {
  let title: String
  let detail: String
  let actionTitle: String
  let action: () -> Void
  var body: some View {
    VStack(spacing: 14) {
      Image(systemName: "tray").font(.system(size: 28)).foregroundStyle(MadarDesign.blue)
        .frame(width: 62, height: 62).background(MadarDesign.paleBlue, in: Circle())
      Text(title).font(MadarDesign.font(19, weight: .bold, relativeTo: .title3)).foregroundStyle(
        MadarDesign.ink)
      Text(detail).font(MadarDesign.font(14)).foregroundStyle(MadarDesign.muted)
        .multilineTextAlignment(.center)
      Button(actionTitle, action: action).font(MadarDesign.font(15, weight: .bold)).foregroundStyle(
        MadarDesign.blue
      ).frame(minHeight: 44)
    }.frame(maxWidth: .infinity).padding(.vertical, 40).padding(.horizontal, 24)
  }
}
