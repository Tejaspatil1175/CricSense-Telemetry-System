using UnityEngine;

namespace CricSense
{
    public enum DeliveryLength { GoodLength, FullLength, ShortLength }
    public enum DeliveryLine { MiddleStump, OffStump, LegStump }

    /// <summary>
    /// Automated bowling machine that pitches balls towards batsman with variable speed, line, length, and seam spin.
    /// </summary>
    public class BowlingMachine : MonoBehaviour
    {
        [Header("Bowling Machine Settings")]
        public GameObject ballPrefab;
        public Transform releasePoint;
        
        [Header("Delivery Parameters")]
        [Range(60f, 150f)]
        public float deliverySpeedKmh = 110f;
        public DeliveryLength pitchLength = DeliveryLength.GoodLength;
        public DeliveryLine pitchLine = DeliveryLine.MiddleStump;
        
        [Range(-5f, 5f)]
        public float seamSpinRps = 0.0f;
        public bool autoBowlOnTimer = false;
        public float autoBowlIntervalSec = 5.0f;

        private float nextBowlTime;

        private void Start()
        {
            if (releasePoint == null) releasePoint = transform;
            nextBowlTime = Time.time + autoBowlIntervalSec;
        }

        private void Update()
        {
            if (autoBowlOnTimer && Time.time >= nextBowlTime)
            {
                nextBowlTime = Time.time + autoBowlIntervalSec;
                BowlBall();
            }
        }

        /// <summary>
        /// Triggers ball release towards batsman end with calculated velocity vector.
        /// </summary>
        public GameObject BowlBall()
        {
            if (ballPrefab == null)
            {
                Debug.LogWarning("[BowlingMachine] Ball prefab is missing!");
                return null;
            }

            // Find or instantiate ball
            GameObject ballObj = Instantiate(ballPrefab, releasePoint.position, Quaternion.identity);
            BallPhysics ballPhysics = ballObj.GetComponent<BallPhysics>();

            if (ballPhysics == null)
            {
                ballPhysics = ballObj.AddComponent<BallPhysics>();
            }

            // Convert delivery speed from km/h to m/s
            float speedMs = deliverySpeedKmh / 3.6f;

            // Target coordinates on pitch
            float targetX = 0.0f;
            if (pitchLine == DeliveryLine.OffStump) targetX = 0.25f;
            else if (pitchLine == DeliveryLine.LegStump) targetX = -0.25f;

            float targetZ = 0.0f; // Good length
            if (pitchLength == DeliveryLength.FullLength) targetZ = 1.2f;
            else if (pitchLength == DeliveryLength.ShortLength) targetZ = -1.2f;

            Vector3 bounceTarget = new Vector3(targetX, 0.0f, targetZ);
            Vector3 releasePos = releasePoint.position;

            // Compute initial launch velocity with gravity arc trajectory
            Vector3 diff = bounceTarget - releasePos;
            Vector3 diffXZ = new Vector3(diff.x, 0f, diff.z);
            float distXZ = diffXZ.magnitude;
            float flightTime = distXZ / speedMs;

            float vx = diff.x / flightTime;
            float vz = diff.z / flightTime;
            float vy = (diff.y - 0.5f * Physics.gravity.y * flightTime * flightTime) / flightTime;

            Vector3 launchVelocity = new Vector3(vx, vy, vz);
            Vector3 spinVector = new Vector3(0f, seamSpinRps, 0f);

            ballPhysics.LaunchDelivery(launchVelocity, spinVector, deliverySpeedKmh);

            // Notify GameManager
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnBallBowled(deliverySpeedKmh);
            }

            return ballObj;
        }
    }
}
