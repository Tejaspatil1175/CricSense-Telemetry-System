using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Animates the 3D Batsman (Virat Kohli model) with stance breathing, bat tap on crease, 
    /// backlift, and follow-through body mechanics.
    /// </summary>
    public class PlayerAnimator : MonoBehaviour
    {
        [Header("Rig References")]
        public Transform headTransform;
        public Transform torsoTransform;
        public Transform leftArmTransform;
        public Transform rightArmTransform;
        public Transform leftLegTransform;
        public Transform rightLegTransform;
        public BatController batController;

        [Header("Stance & Animation Settings")]
        public bool isStanceTapping = true;
        public float tapFrequency = 1.8f;
        public float breathingSpeed = 1.2f;

        private Vector3 initialTorsoPos;
        private Quaternion initialRightArmRot;
        private Quaternion initialLeftArmRot;
        private float tapTimer;

        private void Start()
        {
            if (torsoTransform != null) initialTorsoPos = torsoTransform.localPosition;
            if (rightArmTransform != null) initialRightArmRot = rightArmTransform.localRotation;
            if (leftArmTransform != null) initialLeftArmRot = leftArmTransform.localRotation;
        }

        private void Update()
        {
            float time = Time.time;

            // 1. Subtle breathing motion on torso & head
            if (torsoTransform != null)
            {
                float breathY = Mathf.Sin(time * breathingSpeed) * 0.008f;
                torsoTransform.localPosition = initialTorsoPos + new Vector3(0f, breathY, 0f);
            }

            // 2. Bat tap on crease in stance
            if (isStanceTapping && batController != null && !batController.isSwinging)
            {
                tapTimer += Time.deltaTime * tapFrequency;
                float tapY = Mathf.Abs(Mathf.Sin(tapTimer)) * 0.04f;

                // Sync head glance towards bowler end (-Z)
                if (headTransform != null)
                {
                    headTransform.localRotation = Quaternion.Euler(0f, 85f, 0f); // Head turned towards bowler
                }
            }
        }

        public void TriggerSwingAnimation(float swingSpeedKmh)
        {
            // Sync arm rotation with bat swing
            if (rightArmTransform != null && leftArmTransform != null)
            {
                float swingAngle = Mathf.Clamp(swingSpeedKmh * 0.8f, 20f, 90f);
                rightArmTransform.localRotation = initialRightArmRot * Quaternion.Euler(-swingAngle, 0f, 0f);
                leftArmTransform.localRotation = initialLeftArmRot * Quaternion.Euler(-swingAngle * 0.8f, 0f, 0f);
            }
        }
    }
}
