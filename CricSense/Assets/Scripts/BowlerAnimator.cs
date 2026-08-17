using System.Collections;
using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Animates 3D Bowler run-up, jump delivery stride, 360-degree arm rotation, and follow-through.
    /// </summary>
    public class BowlerAnimator : MonoBehaviour
    {
        [Header("Bowler Rig References")]
        public Transform bowlingArmTransform;
        public Transform leftLegTransform;
        public Transform rightLegTransform;
        public BowlingMachine bowlingMachine;

        [Header("Run-Up Settings")]
        public float runUpStartZ = -18.0f;
        public float deliveryZ = -10.0f;
        public float runUpSpeed = 6.5f;
        public bool isRunningUp = false;

        private Vector3 startPos;

        private void Start()
        {
            startPos = new Vector3(0f, 0f, runUpStartZ);
            transform.position = startPos;
        }

        /// <summary>
        /// Starts bowler run-up and delivery action sequence.
        /// </summary>
        public void TriggerBowlingRunUp()
        {
            if (isRunningUp) return;
            StartCoroutine(RunUpRoutine());
        }

        private IEnumerator RunUpRoutine()
        {
            isRunningUp = true;
            transform.position = new Vector3(0f, 0f, runUpStartZ);

            float currentZ = runUpStartZ;
            float legCycle = 0f;

            // 1. Run-Up phase (Move from -18m to -10m)
            while (currentZ < deliveryZ)
            {
                currentZ += Time.deltaTime * runUpSpeed;
                transform.position = new Vector3(0f, 0f, currentZ);

                // Alternate leg running animation
                legCycle += Time.deltaTime * 14f;
                float legAngle = Mathf.Sin(legCycle) * 35f;

                if (leftLegTransform != null) leftLegTransform.localRotation = Quaternion.Euler(legAngle, 0f, 0f);
                if (rightLegTransform != null) rightLegTransform.localRotation = Quaternion.Euler(-legAngle, 0f, 0f);

                yield return null;
            }

            // 2. Delivery Stride & 360 Arm Wind-Up
            float armRot = 0f;
            while (armRot < 360f)
            {
                armRot += Time.deltaTime * 900f;
                if (bowlingArmTransform != null)
                {
                    bowlingArmTransform.localRotation = Quaternion.Euler(armRot, 0f, 0f);
                }
                yield return null;
            }

            // 3. Release Ball at crease
            if (bowlingMachine != null)
            {
                bowlingMachine.BowlBall();
            }

            // 4. Return to start position after follow-through
            yield return new WaitForSeconds(1.5f);
            transform.position = startPos;
            if (leftLegTransform != null) leftLegTransform.localRotation = Quaternion.identity;
            if (rightLegTransform != null) rightLegTransform.localRotation = Quaternion.identity;
            if (bowlingArmTransform != null) bowlingArmTransform.localRotation = Quaternion.identity;

            isRunningUp = false;
        }
    }
}
