using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Procedural runtime builder that constructs the 3D stadium, brown pitch, white crease lines,
    /// stumps, bails, 3D bat, ball prefab, and camera setups using Unity primitives.
    /// </summary>
    [ExecuteAlways]
    public class StadiumBuilder : MonoBehaviour
    {
        [Header("Materials (Optional Overrides)")]
        public Material grassMaterial;
        public Material pitchMaterial;
        public Material woodMaterial;
        public Material ballMaterial;
        public Material whiteLineMaterial;

        private void Awake()
        {
            BuildEnvironmentIfMissing();
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoInitializeScene()
        {
            StadiumBuilder builder = FindAnyObjectByType<StadiumBuilder>();
            if (builder == null)
            {
                GameObject builderObj = new GameObject("StadiumBuilder");
                builder = builderObj.AddComponent<StadiumBuilder>();
            }
            builder.BuildEnvironmentIfMissing();
        }

        public void BuildEnvironmentIfMissing()
        {
            // 1. Create Materials if missing
            CreateDefaultMaterials();

            // 2. Build Stadium Ground & Pitch Strip
            BuildFieldAndPitch();

            // 3. Build Stumps & Bails at Batsman End and Bowler End
            StumpGroup batsmanStumps = BuildStumps(new Vector3(0.0f, 0.0f, 3.5f), "BatsmanStumps");
            StumpGroup bowlerStumps = BuildStumps(new Vector3(0.0f, 0.0f, -10.0f), "BowlerStumps");

            // 4. Build 3D Cricket Bat
            BatController bat = FindAnyObjectByType<BatController>();
            if (bat == null)
            {
                bat = BuildCricketBat();
            }

            // 5. Build 3D Cricket Ball Prefab & Bowling Machine
            BowlingMachine machine = FindAnyObjectByType<BowlingMachine>();
            if (machine == null)
            {
                machine = BuildBowlingMachine();
            }

            // 6. Setup Camera Controller
            Camera mainCam = Camera.main;
            if (mainCam != null && mainCam.GetComponent<CameraController>() == null)
            {
                mainCam.gameObject.AddComponent<CameraController>();
            }

            // 7. Setup Game Manager & HUD Manager
            GameManager manager = FindAnyObjectByType<GameManager>();
            if (manager == null)
            {
                GameObject mgrObj = new GameObject("GameManager");
                manager = mgrObj.AddComponent<GameManager>();
            }
            manager.bowlingMachine = machine;
            manager.batController = bat;

            HUDManager hud = FindAnyObjectByType<HUDManager>();
            if (hud == null)
            {
                GameObject hudObj = new GameObject("HUDManager");
                hudObj.AddComponent<HUDManager>();
            }

            // 8. Add Directional Sun Light if missing
            Light sun = FindAnyObjectByType<Light>();
            if (sun == null)
            {
                GameObject sunObj = new GameObject("SunLight");
                sun = sunObj.AddComponent<Light>();
                sun.type = LightType.Directional;
                sun.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
                sun.intensity = 1.2f;
                sun.color = new Color(1.0f, 0.96f, 0.85f);
            }
        }

        private void CreateDefaultMaterials()
        {
            if (grassMaterial == null)
            {
                grassMaterial = new Material(Shader.Find("Standard"));
                grassMaterial.color = new Color(0.12f, 0.45f, 0.20f);
                grassMaterial.SetFloat("_Glossiness", 0.1f);
            }
            if (pitchMaterial == null)
            {
                pitchMaterial = new Material(Shader.Find("Standard"));
                pitchMaterial.color = new Color(0.65f, 0.52f, 0.35f);
                pitchMaterial.SetFloat("_Glossiness", 0.2f);
            }
            if (woodMaterial == null)
            {
                woodMaterial = new Material(Shader.Find("Standard"));
                woodMaterial.color = new Color(0.85f, 0.68f, 0.45f);
                woodMaterial.SetFloat("_Glossiness", 0.3f);
            }
            if (ballMaterial == null)
            {
                ballMaterial = new Material(Shader.Find("Standard"));
                ballMaterial.color = new Color(0.82f, 0.18f, 0.12f);
                ballMaterial.SetFloat("_Glossiness", 0.6f);
            }
            if (whiteLineMaterial == null)
            {
                whiteLineMaterial = new Material(Shader.Find("Standard"));
                whiteLineMaterial.color = Color.white;
            }
        }

        private void BuildFieldAndPitch()
        {
            if (GameObject.Find("CricketField") != null) return;

            // Outer Green Stadium Field
            GameObject fieldObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            fieldObj.name = "CricketField";
            fieldObj.transform.position = new Vector3(0f, -0.05f, -3.0f);
            fieldObj.transform.localScale = new Vector3(50f, 0.05f, 50f);
            fieldObj.GetComponent<Renderer>().sharedMaterial = grassMaterial;

            // Rectangular Pitch Strip (22m length x 3m width)
            GameObject pitchObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            pitchObj.name = "PitchStrip";
            pitchObj.transform.position = new Vector3(0f, 0.001f, -3.25f);
            pitchObj.transform.localScale = new Vector3(3.0f, 0.01f, 16.5f);
            pitchObj.GetComponent<Renderer>().sharedMaterial = pitchMaterial;

            // Crease Lines (Batsman End Z = 2.7m, Bowler End Z = -10.0m)
            CreateCreaseLine(new Vector3(0f, 0.005f, 2.7f), new Vector3(2.4f, 0.005f, 0.08f));
            CreateCreaseLine(new Vector3(0f, 0.005f, -10.0f), new Vector3(2.4f, 0.005f, 0.08f));
        }

        private void CreateCreaseLine(Vector3 pos, Vector3 scale)
        {
            GameObject line = GameObject.CreatePrimitive(PrimitiveType.Cube);
            line.name = "CreaseLine";
            line.transform.position = pos;
            line.transform.localScale = scale;
            line.GetComponent<Renderer>().sharedMaterial = whiteLineMaterial;
        }

        private StumpGroup BuildStumps(Vector3 basePos, string name)
        {
            if (GameObject.Find(name) != null) return GameObject.Find(name).GetComponent<StumpGroup>();

            GameObject groupObj = new GameObject(name);
            groupObj.transform.position = basePos;
            StumpGroup stumpGroup = groupObj.AddComponent<StumpGroup>();

            float stumpSpacing = 0.12f;
            float stumpHeight = 0.71f;
            float stumpRadius = 0.025f;

            GameObject[] stumpObjs = new GameObject[3];
            for (int i = -1; i <= 1; i++)
            {
                GameObject stump = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                stump.name = $"Stump_{i}";
                stump.transform.SetParent(groupObj.transform);
                stump.transform.localPosition = new Vector3(i * stumpSpacing, stumpHeight / 2f, 0f);
                stump.transform.localScale = new Vector3(stumpRadius * 2f, stumpHeight / 2f, stumpRadius * 2f);
                stump.GetComponent<Renderer>().sharedMaterial = woodMaterial;

                Rigidbody rb = stump.AddComponent<Rigidbody>();
                rb.isKinematic = true;
                stumpObjs[i + 1] = stump;
            }
            stumpGroup.stumps = stumpObjs;

            // 2 Bails on top
            GameObject[] bailObjs = new GameObject[2];
            for (int i = 0; i < 2; i++)
            {
                float bailX = (i == 0) ? -0.06f : 0.06f;
                GameObject bail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                bail.name = $"Bail_{i}";
                bail.transform.SetParent(groupObj.transform);
                bail.transform.localPosition = new Vector3(bailX, stumpHeight + 0.02f, 0f);
                bail.transform.localScale = new Vector3(0.11f, 0.025f, 0.025f);
                bail.GetComponent<Renderer>().sharedMaterial = woodMaterial;

                Rigidbody rb = bail.AddComponent<Rigidbody>();
                rb.isKinematic = true;
                bailObjs[i] = bail;
            }
            stumpGroup.bails = bailObjs;

            return stumpGroup;
        }

        private BatController BuildCricketBat()
        {
            GameObject batGroup = new GameObject("3D_Bat_Group");
            BatController batCtrl = batGroup.AddComponent<BatController>();

            // Handle
            GameObject handle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            handle.name = "BatHandle";
            handle.transform.SetParent(batGroup.transform);
            handle.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            handle.transform.localScale = new Vector3(0.04f, 0.25f, 0.04f);

            // Grip Ring
            GameObject ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "GripRing";
            ring.transform.SetParent(batGroup.transform);
            ring.transform.localPosition = new Vector3(0f, 0.25f, 0f);
            ring.transform.localScale = new Vector3(0.05f, 0.015f, 0.05f);

            // Blade
            GameObject blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
            blade.name = "BatBlade";
            blade.transform.SetParent(batGroup.transform);
            blade.transform.localPosition = new Vector3(0f, -0.15f, 0f);
            blade.transform.localScale = new Vector3(0.12f, 0.70f, 0.05f);
            blade.GetComponent<Renderer>().sharedMaterial = woodMaterial;

            // Add BoxCollider trigger for bat face
            BoxCollider col = blade.GetComponent<BoxCollider>();
            col.isTrigger = true;

            return batCtrl;
        }

        private BowlingMachine BuildBowlingMachine()
        {
            GameObject machineObj = new GameObject("BowlingMachine");
            machineObj.transform.position = new Vector3(0f, 1.8f, -10.0f);
            BowlingMachine machine = machineObj.AddComponent<BowlingMachine>();

            // Create Ball Prefab Gameobject
            GameObject ballObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            ballObj.name = "CricketBall_Prefab";
            ballObj.transform.localScale = new Vector3(0.18f, 0.18f, 0.18f); // 9cm radius sphere
            ballObj.GetComponent<Renderer>().sharedMaterial = ballMaterial;
            
            BallPhysics bp = ballObj.AddComponent<BallPhysics>();
            machine.ballPrefab = ballObj;

            // Hide template ball
            ballObj.SetActive(false);

            return machine;
        }
    }
}
