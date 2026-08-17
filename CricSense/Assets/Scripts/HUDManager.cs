using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Live HUD overlay rendering score, overs, ball speed, shot announcements, and control buttons.
    /// </summary>
    public class HUDManager : MonoBehaviour
    {
        public bool showHUD = false;

        private GUIStyle headerStyle;
        private GUIStyle bannerStyle;
        private GUIStyle btnStyle;
        private GUIStyle cardStyle;

        private void OnGUI()
        {
            if (!showHUD) return;

            InitStyles();

            // 1. Scorecard HUD Top Bar
            GUI.Box(new Rect(16, 16, 360, 110), "", cardStyle);
            
            int runs = GameManager.Instance != null ? GameManager.Instance.totalRuns : 0;
            int wickets = GameManager.Instance != null ? GameManager.Instance.wicketsLost : 0;
            string overs = GameManager.Instance != null ? GameManager.Instance.GetOversString() : "0.0";
            string banner = GameManager.Instance != null ? GameManager.Instance.announcementBanner : "Ready";

            GUI.Label(new Rect(28, 24, 340, 24), "1-OVER CRICKET MATCH", headerStyle);
            
            GUIStyle scoreStyle = new GUIStyle(headerStyle);
            scoreStyle.fontSize = 24;
            scoreStyle.normal.textColor = Color.white;
            GUI.Label(new Rect(28, 48, 340, 32), $"SCORE: {runs}/{wickets}  ({overs} Overs)", scoreStyle);

            GUIStyle bannerLabelStyle = new GUIStyle(headerStyle);
            bannerLabelStyle.fontSize = 13;
            bannerLabelStyle.normal.textColor = new Color(1.0f, 0.84f, 0.0f);
            GUI.Label(new Rect(28, 86, 340, 24), banner, bannerLabelStyle);

            // 2. Action Buttons Bottom Left
            float btnY = Screen.height - 140;

            if (GUI.Button(new Rect(16, btnY, 180, 44), "🎾 BOWL NEXT BALL", btnStyle))
            {
                BowlerAnimator bowlerAnim = FindAnyObjectByType<BowlerAnimator>();
                if (bowlerAnim != null)
                {
                    bowlerAnim.TriggerBowlingRunUp();
                }
                else if (GameManager.Instance != null && GameManager.Instance.bowlingMachine != null)
                {
                    GameManager.Instance.bowlingMachine.BowlBall();
                }
            }

            if (GUI.Button(new Rect(206, btnY, 170, 44), "🎥 CAMERA POV", btnStyle))
            {
                if (CameraController.Instance != null)
                {
                    CameraController.Instance.CycleCameraMode();
                }
            }

            if (GUI.Button(new Rect(16, btnY + 54, 180, 44), "🎯 CALIBRATE STANCE", btnStyle))
            {
                if (GameManager.Instance != null && GameManager.Instance.batController != null)
                {
                    GameManager.Instance.batController.CalibrateNeutralStance();
                }
            }

            // 3. Bat Physics Panel Bottom Right
            float rightX = Screen.width - 240;
            if (rightX > 400)
            {
                GUI.Box(new Rect(rightX, Screen.height - 150, 220, 130), "", cardStyle);
                GUI.Label(new Rect(rightX + 12, Screen.height - 142, 200, 20), "⚡ BAT SWING METRICS", headerStyle);
                
                float batSpeed = GameManager.Instance != null ? GameManager.Instance.lastBatSpeedKmh : 0f;
                string shotType = GameManager.Instance != null ? GameManager.Instance.lastShotType : "Ready";

                GUIStyle speedStyle = new GUIStyle(headerStyle);
                speedStyle.fontSize = 20;
                speedStyle.normal.textColor = new Color(0.0f, 0.9f, 0.6f);
                GUI.Label(new Rect(rightX + 12, Screen.height - 118, 200, 28), $"{batSpeed:F1} km/h", speedStyle);

                GUIStyle shotStyle = new GUIStyle(headerStyle);
                shotStyle.fontSize = 12;
                shotStyle.normal.textColor = Color.white;
                GUI.Label(new Rect(rightX + 12, Screen.height - 86, 200, 20), $"Shot: {shotType}", shotStyle);
            }
        }

        private void InitStyles()
        {
            if (headerStyle != null) return;

            headerStyle = new GUIStyle();
            headerStyle.fontSize = 12;
            headerStyle.fontStyle = FontStyle.Bold;
            headerStyle.normal.textColor = new Color(0.0f, 0.9f, 0.6f);

            btnStyle = new GUIStyle(GUI.skin.button);
            btnStyle.fontSize = 12;
            btnStyle.fontStyle = FontStyle.Bold;

            cardStyle = new GUIStyle(GUI.skin.box);
        }
    }
}
