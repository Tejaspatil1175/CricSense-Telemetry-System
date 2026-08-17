using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace CricSense
{
    /// <summary>
    /// Manages 3D Cricket Bat stance, motion smoothing, testing controls, 
    /// and telemetry input hook for mobile sensor streaming.
    /// </summary>
    public class BatController : MonoBehaviour
    {
        [Header("Stance & Crease Configuration")]
        [Tooltip("True for Left-Handed batsman, False for Right-Handed batsman stance.")]
        public bool isLeftHanded = true;
        public Vector3 stanceOffset = new Vector3(-0.28f, 0.40f, 2.70f);

        [Header("Motion & Smoothing")]
        [Range(0.01f, 1.0f)]
        public float slerpSpeed = 0.85f;

        [Header("Telemetry Interface Data (For Mobile App Connectivity)")]
        public Quaternion rawTelemetryQuaternion = Quaternion.identity;
        public Vector3 rawAccelerometer = Vector3.zero;
        public Vector3 rawGyroscope = Vector3.zero;
        public bool hasActiveTelemetry = false;

        [Header("Computed Bat Physics Metrics")]
        public Vector3 batVelocity;
        public Vector3 batFaceNormal = Vector3.forward;
        public float faceAngleDeg;
        public float planeAngleDeg;
        public bool isSwinging;

        private Quaternion calibrationQuaternion = Quaternion.identity;
        private Quaternion targetRotation = Quaternion.identity;
        private Vector3 lastPosition;
        private Vector3 stancePosition;
        private float lastMouseX;
        private float lastMouseY;

        private void Awake()
        {
            UpdateStancePosition();
            transform.position = stancePosition;
            lastPosition = transform.position;
        }

        private void Update()
        {
            // 1. Process local testing controls if hardware telemetry is inactive
            if (!hasActiveTelemetry)
            {
                HandleLocalEditorControls();
            }

            // 2. Compute relative orientation against neutral calibration stance
            Quaternion relativeQuat = Quaternion.Inverse(calibrationQuaternion) * rawTelemetryQuaternion;
            targetRotation = relativeQuat;

            // 3. Smoothly update 3D bat rotation (85% slerp factor for hyper-fast response)
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, slerpSpeed);

            // 4. Calculate real-time bat physics metrics
            Vector3 currentPos = transform.position;
            batVelocity = (currentPos - lastPosition) / Time.deltaTime;
            lastPosition = currentPos;

            // Bat face normal points forward down the pitch towards bowler (-Z)
            batFaceNormal = transform.forward;
            
            // Face Angle (Open/Closed angle in degrees)
            faceAngleDeg = transform.eulerAngles.y;
            if (faceAngleDeg > 180f) faceAngleDeg -= 360f;

            // Plane Angle (Vertical vs Horizontal cross-bat tilt)
            planeAngleDeg = transform.eulerAngles.x;
            if (planeAngleDeg > 180f) planeAngleDeg -= 360f;

            isSwinging = batVelocity.magnitude > 2.0f || rawGyroscope.magnitude > 2.0f;
        }

        /// <summary>
        /// Update bat stance position based on Left-Handed / Right-Handed preference.
        /// </summary>
        public void UpdateStancePosition()
        {
            float posX = isLeftHanded ? -0.28f : 0.28f;
            stancePosition = new Vector3(posX, stanceOffset.y, stanceOffset.z);
            transform.position = stancePosition;
        }

        /// <summary>
        /// Primary Telemetry API interface for hardware/mobile app sensor packet integration.
        /// </summary>
        public void SetRawTelemetry(Quaternion rawQuat, Vector3 accel, Vector3 gyro)
        {
            hasActiveTelemetry = true;
            rawTelemetryQuaternion = rawQuat;
            rawAccelerometer = accel;
            rawGyroscope = gyro;
        }

        /// <summary>
        /// Neutralize current bat pose as the zero stance calibration reference.
        /// </summary>
        public void CalibrateNeutralStance()
        {
            calibrationQuaternion = rawTelemetryQuaternion;
        }

        /// <summary>
        /// Local Mouse & Keyboard controls for rapid in-editor testing without physical phone.
        /// Compatible with both New Input System package and legacy Input Manager.
        /// </summary>
        private void HandleLocalEditorControls()
        {
            bool isMousePressed = false;
            bool isSpacePressed = false;
            Vector2 currentMousePos = Vector2.zero;

#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                isMousePressed = Mouse.current.leftButton.isPressed;
                currentMousePos = Mouse.current.position.ReadValue();
            }
            if (Keyboard.current != null)
            {
                isSpacePressed = Keyboard.current.spaceKey.isPressed;
            }
#else
            isMousePressed = Input.GetMouseButton(0);
            isSpacePressed = Input.GetKey(KeyCode.Space);
            currentMousePos = Input.mousePosition;
#endif

            // Mouse Drag controls pitch (X) and yaw (Y)
            if (isMousePressed)
            {
                float deltaX = (currentMousePos.x - lastMouseX) * 0.5f;
                float deltaY = (currentMousePos.y - lastMouseY) * 0.5f;

                Vector3 currentEuler = rawTelemetryQuaternion.eulerAngles;
                float pitch = currentEuler.x - deltaY;
                float yaw = currentEuler.y + deltaX;

                rawTelemetryQuaternion = Quaternion.Euler(pitch, yaw, 0f);
            }
            else if (isSpacePressed)
            {
                // Spacebar swing trigger animation simulation
                float swingT = Mathf.PingPong(Time.time * 6f, 1f);
                float pitch = Mathf.Lerp(0f, -60f, swingT);
                float yaw = Mathf.Lerp(0f, 45f * (isLeftHanded ? 1f : -1f), swingT);

                rawTelemetryQuaternion = Quaternion.Euler(pitch, yaw, 0f);
            }

            lastMouseX = currentMousePos.x;
            lastMouseY = currentMousePos.y;
        }
    }
}
