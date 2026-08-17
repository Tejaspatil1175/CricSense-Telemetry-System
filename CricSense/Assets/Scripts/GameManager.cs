using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Match loop manager tracking scorecard, 6-ball overs, wickets, shot classifications, and match status.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Match Scorecard State")]
        public int totalRuns = 0;
        public int wicketsLost = 0;
        public int totalBallsBowled = 0;
        public int maxOvers = 1;

        [Header("Last Ball Stats")]
        public float lastBallSpeedKmh = 0f;
        public float lastBatSpeedKmh = 0f;
        public float lastHitDistanceMeters = 0f;
        public string lastShotType = "Stance / Ready";
        public string announcementBanner = "Ready for Delivery!";

        [Header("References")]
        public BowlingMachine bowlingMachine;
        public BatController batController;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void OnBallBowled(float ballSpeedKmh)
        {
            totalBallsBowled++;
            lastBallSpeedKmh = ballSpeedKmh;
            announcementBanner = $"🎾 Ball Bowled! ({ballSpeedKmh:F1} km/h)";
        }

        public void OnShotExecuted(string shotName, float batSpeedKmh, float distanceMeters, int runs)
        {
            totalRuns += runs;
            lastBatSpeedKmh = batSpeedKmh;
            lastHitDistanceMeters = distanceMeters;
            lastShotType = shotName;

            if (runs == 6) announcementBanner = $"SIX! 💥 {shotName} ({distanceMeters:F1}m)";
            else if (runs == 4) announcementBanner = $"FOUR! 🚀 {shotName} ({distanceMeters:F1}m)";
            else if (runs > 0) announcementBanner = $"{runs} RUN(S)! 🏏 {shotName} ({distanceMeters:F1}m)";
            else announcementBanner = $"0 RUNS • {shotName}";

            // Trigger follow camera on big hits
            if (runs >= 4 && CameraController.Instance != null)
            {
                CameraController.Instance.SetCameraMode(CameraMode.FollowBall);
            }
        }

        public void OnWicketFallen(string wicketReason)
        {
            wicketsLost++;
            lastShotType = "WICKET!";
            announcementBanner = $"OUT! 💥 {wicketReason}";
        }

        public string GetOversString()
        {
            int overs = totalBallsBowled / 6;
            int balls = totalBallsBowled % 6;
            return $"{overs}.{balls}";
        }

        public void ResetMatch()
        {
            totalRuns = 0;
            wicketsLost = 0;
            totalBallsBowled = 0;
            announcementBanner = "New Match Started!";
        }
    }
}
