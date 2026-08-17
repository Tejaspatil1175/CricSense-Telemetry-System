using UnityEngine;

namespace CricSense
{
    public enum CameraMode { BatsmanEye, BroadcastCam, BowlerCam, FollowBall }

    /// <summary>
    /// Controls multi-POV camera transitions (BatsmanEye, BroadcastCam, BowlerCam, FollowBall).
    /// </summary>
    public class CameraController : MonoBehaviour
    {
        public static CameraController Instance { get; private set; }

        [Header("Current Mode")]
        public CameraMode activeMode = CameraMode.BatsmanEye;

        [Header("Camera Transition Speed")]
        public float lerpSpeed = 6.0f;

        [Header("Target Target Object for Follow Mode")]
        public Transform targetBallTransform;

        private Vector3 targetPosition;
        private Quaternion targetRotation;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Start()
        {
            ApplyCameraPreset(activeMode);
            transform.position = targetPosition;
            transform.rotation = targetRotation;
        }

        private void LateUpdate()
        {
            if (activeMode == CameraMode.FollowBall && targetBallTransform != null)
            {
                targetPosition = targetBallTransform.position + new Vector3(0f, 2.5f, 4.0f);
                targetRotation = Quaternion.LookRotation(targetBallTransform.position - targetPosition);
            }

            transform.position = Vector3.Lerp(transform.position, targetPosition, Time.deltaTime * lerpSpeed);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * lerpSpeed);
        }

        public void SetCameraMode(CameraMode mode)
        {
            activeMode = mode;
            ApplyCameraPreset(mode);
        }

        public void CycleCameraMode()
        {
            int nextModeIndex = ((int)activeMode + 1) % 3; // Cycle through BatsmanEye, Broadcast, Bowler
            SetCameraMode((CameraMode)nextModeIndex);
        }

        private void ApplyCameraPreset(CameraMode mode)
        {
            switch (mode)
            {
                case CameraMode.BatsmanEye:
                    targetPosition = new Vector3(-0.35f, 1.25f, 2.85f);
                    targetRotation = Quaternion.LookRotation(new Vector3(0.05f, 0.55f, -4.5f) - targetPosition);
                    break;

                case CameraMode.BroadcastCam:
                    targetPosition = new Vector3(0.0f, 2.2f, 5.5f);
                    targetRotation = Quaternion.LookRotation(new Vector3(0.0f, 0.4f, -1.0f) - targetPosition);
                    break;

                case CameraMode.BowlerCam:
                    targetPosition = new Vector3(0.0f, 2.0f, -4.5f);
                    targetRotation = Quaternion.LookRotation(new Vector3(0.0f, 0.4f, 2.8f) - targetPosition);
                    break;
            }
        }
    }
}
