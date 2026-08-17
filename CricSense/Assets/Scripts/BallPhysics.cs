using UnityEngine;

namespace CricSense
{
    public enum BallState { InFlight, BouncedOnPitch, HitByBat, WicketHit, Dead }

    /// <summary>
    /// Handles ball trajectory, pitch bounce friction, bat collision physics, and shot classification.
    /// </summary>
    public class BallPhysics : MonoBehaviour
    {
        [Header("Ball Status")]
        public BallState currentState = BallState.InFlight;
        public float initialSpeedKmh;
        public Vector3 velocity;
        public Vector3 spinVelocity;

        [Header("Physics Constants")]
        public float restitutionFactor = 0.65f; // Coefficient of restitution on pitch
        public float pitchFriction = 0.85f;

        private Rigidbody rb;
        private Vector3 startPosition;
        private bool hasBounced = false;
        private float lifeTime = 0.0f;
        private const float MAX_LIFETIME = 8.0f;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            if (rb == null) rb = gameObject.AddComponent<Rigidbody>();

            rb.mass = 0.16f; // Standard 160g cricket ball
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
        }

        private void Update()
        {
            lifeTime += Time.deltaTime;
            if (lifeTime > MAX_LIFETIME && currentState != BallState.Dead)
            {
                currentState = BallState.Dead;
                Destroy(gameObject, 1.0f);
            }

            // Check pitch surface bounce manual fallback if trigger triggers
            if (!hasBounced && transform.position.y <= 0.09f && transform.position.z > -8.0f && transform.position.z < 3.5f)
            {
                HandlePitchBounce();
            }
        }

        public void LaunchDelivery(Vector3 initialVelocity, Vector3 spin, float speedKmh)
        {
            initialSpeedKmh = speedKmh;
            velocity = initialVelocity;
            spinVelocity = spin;
            startPosition = transform.position;

            rb.isKinematic = false;
            rb.linearVelocity = initialVelocity;
            rb.angularVelocity = spin;
            currentState = BallState.InFlight;
        }

        private void HandlePitchBounce()
        {
            hasBounced = true;
            currentState = BallState.BouncedOnPitch;

            Vector3 currentVel = rb.linearVelocity;

            // Bounce equations (Reverse Y, reduce Z speed, apply seam X spin)
            float vy = Mathf.Abs(currentVel.y) * restitutionFactor;
            float vz = currentVel.z * pitchFriction;
            float vx = currentVel.x + spinVelocity.y * 0.15f;

            rb.linearVelocity = new Vector3(vx, vy, vz);
        }

        private void OnCollisionEnter(Collision collision)
        {
            // 1. Collision with Bat
            BatController bat = collision.gameObject.GetComponentInParent<BatController>();
            if (bat != null && currentState != BallState.HitByBat)
            {
                ProcessBatImpact(bat, collision.contacts[0].point);
                return;
            }

            // 2. Collision with Stumps
            StumpGroup stumps = collision.gameObject.GetComponentInParent<StumpGroup>();
            if (stumps != null && currentState != BallState.HitByBat && currentState != BallState.WicketHit)
            {
                currentState = BallState.WicketHit;
                stumps.TriggerWicket(rb.linearVelocity);

                if (GameManager.Instance != null)
                {
                    GameManager.Instance.OnWicketFallen("BOWLED! Wicket Broken 💥");
                }
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            BatController bat = other.GetComponentInParent<BatController>();
            if (bat != null && currentState != BallState.HitByBat)
            {
                ProcessBatImpact(bat, other.ClosestPoint(transform.position));
            }
        }

        /// <summary>
        /// Real-time 3D physics calculation for bat-ball collision rebound trajectory & shot classifier.
        /// </summary>
        private void ProcessBatImpact(BatController bat, Vector3 impactPoint)
        {
            currentState = BallState.HitByBat;

            Vector3 incomingVel = rb.linearVelocity;
            Vector3 batVel = bat.batVelocity;
            Vector3 batNormal = bat.batFaceNormal;

            // Relative swing velocity
            Vector3 relVel = incomingVel - batVel;
            float batSpeedKmh = batVel.magnitude * 3.6f;

            // Rebound vector calculation based on surface normal & stroke speed
            float impactPower = Mathf.Max(batVel.magnitude * 1.6f, 12.0f);
            Vector3 reboundDir = Vector3.Reflect(relVel.normalized, batNormal);
            
            // Lift trajectory upward based on pitch angle
            reboundDir.y = Mathf.Clamp(reboundDir.y + 0.35f, 0.15f, 0.85f);
            reboundDir.Normalize();

            Vector3 finalVel = reboundDir * impactPower;
            rb.linearVelocity = finalVel;

            // Compute shot distance & runs
            float estimatedDistMeters = (impactPower * impactPower) / 9.81f * 1.8f;
            int runs = 0;
            if (estimatedDistMeters >= 70f) runs = 6;
            else if (estimatedDistMeters >= 45f) runs = 4;
            else if (estimatedDistMeters >= 25f) runs = 2;
            else if (estimatedDistMeters >= 10f) runs = 1;

            // Classify Cricket Shot Type
            string shotName = ClassifyShot(bat, reboundDir, batSpeedKmh);

            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnShotExecuted(shotName, batSpeedKmh, estimatedDistMeters, runs);
            }
        }

        private string ClassifyShot(BatController bat, Vector3 reboundDir, float speedKmh)
        {
            float relX = reboundDir.x;
            float absX = Mathf.Abs(relX);
            bool isCrossBat = Mathf.Abs(bat.planeAngleDeg) < 40f;

            if (speedKmh < 10f) return "Defensive Block 🛡️";

            if (isCrossBat)
            {
                if (relX < -0.3f) return "Pull / Hook Shot 💥";
                return "Square Cut 🔪";
            }
            else
            {
                if (relX > 0.35f) return "Cover Drive 🚀";
                if (relX < -0.35f) return "On Drive / Flick 🏏";
                if (reboundDir.y > 0.5f) return "Lofted Six ⚡";
                return "Straight Drive 🎯";
            }
        }
    }
}
