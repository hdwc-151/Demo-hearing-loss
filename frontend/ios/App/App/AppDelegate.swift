import UIKit
import Capacitor
import AVFoundation
import HealthKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Web Audio trong WKWebView bị công tắc im lặng của iPhone chặn nếu không đặt AVAudioSession = playback;
        // app này mô phỏng âm thanh nên cần phát được khi người dùng đang bật chế độ im lặng.
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("HearAtlas: không đặt được AVAudioSession: \(error)")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}


// iOS-only, explicitly user-initiated read-only HealthKit bridge.
// Data is returned to WKWebView in memory, never POSTed, saved or trained on.
// HealthKit may return no samples both when access is denied and when no data exists;
// the UI deliberately does not claim to distinguish these cases.
@objc(HealthAudiogramPlugin)
public class HealthAudiogramPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthAudiogramPlugin"
    public let jsName = "HealthAudiogram"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readLatest", returnType: CAPPluginReturnPromise)
    ]
    private let healthStore = HKHealthStore()

    @objc public func availability(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc public func readLatest(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit không có trên thiết bị này.")
            return
        }
        let kind = HKObjectType.audiogramSampleType()
        // Request *read* permission only; users may revoke access at any time.
        healthStore.requestAuthorization(toShare: [], read: [kind]) { [weak self] completed, error in
            guard let self = self else { call.reject("Cầu nối HealthKit không khả dụng."); return }
            if let error = error { call.reject("Không thể hỏi quyền HealthKit: \(error.localizedDescription)"); return }
            guard completed else { call.reject("Không thể hoàn thành yêu cầu quyền HealthKit."); return }
            let order = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: kind, predicate: nil, limit: 1,
                                      sortDescriptors: [order]) { _, samples, queryError in
                if let queryError = queryError {
                    call.reject("Không đọc được audiogram từ Apple Health: \(queryError.localizedDescription)")
                    return
                }
                guard let sample = samples?.first as? HKAudiogramSample else {
                    call.resolve(["found": false, "message": "Không tìm thấy audiogram được phép đọc. Có thể chưa có dữ liệu hoặc quyền đọc chưa được cấp."])
                    return
                }
                let hz = HKUnit.hertz()
                let dbHL = HKUnit.decibelHearingLevel()
                let points: [[String: Any]] = sample.sensitivityPoints.compactMap { point in
                    let f = point.frequency.doubleValue(for: hz)
                    guard f.isFinite && f >= 125 && f <= 16000 else { return nil }
                    var left: Double? = nil
                    var right: Double? = nil
                    if #available(iOS 18.1, *) {
                        for test in point.tests where test.type == .air {
                            let value = test.sensitivity.doubleValue(for: dbHL)
                            if value.isFinite && value >= -20 && value <= 130 {
                                if test.side == .left { left = value }
                                if test.side == .right { right = value }
                            }
                        }
                    } else {
                        // Compatibility path for iOS 15–18.0; Apple deprecated
                        // these fields when richer per-side tests were added.
                        left = point.leftEarSensitivity?.doubleValue(for: dbHL)
                        right = point.rightEarSensitivity?.doubleValue(for: dbHL)
                    }
                    if left == nil && right == nil { return nil }
                    var output: [String: Any] = ["frequencyHz": f]
                    if let l = left, l.isFinite { output["leftDbHL"] = l }
                    if let r = right, r.isFinite { output["rightDbHL"] = r }
                    return output
                }
                call.resolve([
                    "found": !points.isEmpty,
                    "source": "apple_healthkit",
                    "sampleId": sample.uuid.uuidString,
                    "measuredAt": ISO8601DateFormatter().string(from: sample.endDate),
                    "unit": "dB HL",
                    "points": points,
                    "transmitted": false,
                    "saved": false
                ])
            }
            self.healthStore.execute(query)
        }
    }
}
