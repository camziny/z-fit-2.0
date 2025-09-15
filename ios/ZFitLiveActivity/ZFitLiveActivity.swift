import ActivityKit
import WidgetKit
import SwiftUI

struct WorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentSet: Int
        var totalSets: Int
        var reps: Int
        var weight: String?
        var restEnabled: Bool
        var restTimeRemaining: Int
        var isSuperset: Bool
        var supersetInfo: String?
    }
    var sessionId: String
    var exerciseName: String
}

struct ZFitLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutAttributes.self) { context in
            LiveActivityView(context: context)
                .widgetURL(URL(string: "zfit20://workout?sessionId=\(context.attributes.sessionId)"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ProgressCircle(current: context.state.currentSet, total: context.state.totalSets)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.exerciseName).font(.headline).lineLimit(1)
                        HStack(spacing: 8) {
                            Text("Set \(context.state.currentSet)/\(context.state.totalSets) • \(context.state.reps) reps").font(.subheadline)
                            if let w = context.state.weight { Text("• \(w)").font(.subheadline) }
                            if context.state.isSuperset, let s = context.state.supersetInfo { Text("• \(s)").font(.subheadline) }
                        }.lineLimit(1)
                        ProgressView(value: Double(context.state.currentSet), total: Double(max(context.state.totalSets, 1))).tint(.accentColor)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.restEnabled && context.state.restTimeRemaining > 0 {
                        RestBadge(seconds: context.state.restTimeRemaining)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) { EmptyView() }
            } compactLeading: {
                ProgressCircle(current: context.state.currentSet, total: context.state.totalSets)
            } compactTrailing: {
                if context.state.restEnabled && context.state.restTimeRemaining > 0 {
                    Text("\(context.state.restTimeRemaining)s").font(.caption2)
                }
            } minimal: {
                ProgressCircle(current: context.state.currentSet, total: context.state.totalSets)
            }
        }
    }
}

private struct LiveActivityView: View {
    let context: ActivityViewContext<WorkoutAttributes>
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16).fill(Color(UIColor.secondarySystemBackground))
            VStack(alignment: .leading, spacing: 6) {
                Text(context.attributes.exerciseName).font(.headline).lineLimit(1)
                HStack(spacing: 8) {
                    Text("Set \(context.state.currentSet)/\(context.state.totalSets)")
                    Text("• \(context.state.reps) reps")
                    if let w = context.state.weight { Text("• \(w)") }
                    if context.state.isSuperset, let s = context.state.supersetInfo { Text("• \(s)") }
                }.font(.subheadline).lineLimit(1)
                ProgressView(value: Double(context.state.currentSet), total: Double(max(context.state.totalSets, 1)))
                if context.state.restEnabled && context.state.restTimeRemaining > 0 {
                    RestBadge(seconds: context.state.restTimeRemaining).padding(.top, 2)
                }
            }.padding(12)
        }
        .widgetURL(URL(string: "zfit20://workout?sessionId=\(context.attributes.sessionId)"))
    }
}

private struct ProgressCircle: View {
    let current: Int
    let total: Int
    var body: some View {
        ZStack {
            Circle().stroke(.gray.opacity(0.25), lineWidth: 3)
            Circle()
                .trim(from: 0, to: CGFloat(Double(current) / Double(max(total, 1))))
                .stroke(Color.accentColor, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }.frame(width: 22, height: 22)
    }
}

private struct RestBadge: View {
    let seconds: Int
    var body: some View {
        Text("Rest \(seconds)s")
            .font(.caption2)
            .padding(.vertical, 4)
            .padding(.horizontal, 8)
            .background(Color.accentColor.opacity(0.15))
            .clipShape(Capsule())
    }
}
