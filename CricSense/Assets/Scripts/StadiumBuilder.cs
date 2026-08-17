using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Procedural runtime builder that constructs the 3D stadium, MRF Genius Cricket Bat,
    /// 3D Virat Kohli Batsman model, 3D Bowler player, floodlight towers, advertising boundary boards,
    /// brown pitch, white crease lines, stumps, bails, and camera setups.
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
        public Material indiaJerseyMaterial;
        public Material mrfRedMaterial;
        public Material padWhiteMaterial;
        public Material helmetNavyMaterial;
        public Material skinMaterial;

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
            // 1. Create Materials
            CreateDefaultMaterials();

            // 2. Build Stadium Field, Pitch & Floodlights
            BuildFieldAndPitch();
            BuildStadiumFloodlights();
            BuildBoundaryAdBoards();

            // 3. Build Stumps & Bails at Batsman End and Bowler End
            StumpGroup batsmanStumps = BuildStumps(new Vector3(0.0f, 0.0f, 3.5f), "BatsmanStumps");
            StumpGroup bowlerStumps = BuildStumps(new Vector3(0.0f, 0.0f, -10.0f), "BowlerStumps");

            // 4. Build MRF Genius Bat & 3D Virat Kohli Batsman Model
            BatController bat = FindAnyObjectByType<BatController>();
            if (bat == null)
            {
                bat = BuildMRFCricketBat();
            }

            BuildViratKohliBatsman(bat);

            // 5. Build 3D Bowler & Bowling Machine
            BowlingMachine machine = FindAnyObjectByType<BowlingMachine>();
            if (machine == null)
            {
                machine = BuildBowlingMachine();
            }
            Build3DBowler(machine);

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
                sun.intensity = 1.25f;
                sun.color = new Color(1.0f, 0.96f, 0.88f);
            }
        }

        /// <summary>
        /// Returns a shader that actually renders in the active render pipeline.
        /// Fixes the "everything is magenta" bug caused by using the legacy
        /// "Standard" shader inside a URP project (URP cannot render it).
        /// </summary>
        private Shader GetShader()
        {
            Shader s = Shader.Find("Universal Render Pipeline/Lit");
            if (s == null) s = Shader.Find("Universal Render Pipeline/Simple Lit");
            if (s == null) s = Shader.Find("Standard");
            if (s == null) s = Shader.Find("Legacy Shaders/Diffuse");
            return s;
        }

        private Material MakeMaterial(Color color, float smoothness)
        {
            Material mat = new Material(GetShader());
            mat.color = color;

            // URP Lit uses "_Smoothness", legacy Standard uses "_Glossiness".
            if (mat.HasProperty("_Smoothness")) mat.SetFloat("_Smoothness", smoothness);
            if (mat.HasProperty("_Glossiness")) mat.SetFloat("_Glossiness", smoothness);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);

            return mat;
        }

        private void CreateDefaultMaterials()
        {
            if (grassMaterial == null)
                grassMaterial = MakeMaterial(new Color(0.10f, 0.42f, 0.18f), 0.15f);

            if (pitchMaterial == null)
                pitchMaterial = MakeMaterial(new Color(0.68f, 0.54f, 0.36f), 0.2f);

            if (woodMaterial == null)
                woodMaterial = MakeMaterial(new Color(0.88f, 0.72f, 0.48f), 0.3f);

            if (ballMaterial == null)
                ballMaterial = MakeMaterial(new Color(0.82f, 0.18f, 0.12f), 0.65f);

            if (whiteLineMaterial == null)
                whiteLineMaterial = MakeMaterial(Color.white, 0.1f);

            if (indiaJerseyMaterial == null)
                indiaJerseyMaterial = MakeMaterial(new Color(0.02f, 0.20f, 0.45f), 0.4f); // Team India Blue

            if (mrfRedMaterial == null)
                mrfRedMaterial = MakeMaterial(new Color(0.88f, 0.11f, 0.28f), 0.6f); // Vibrant MRF Red

            if (padWhiteMaterial == null)
                padWhiteMaterial = MakeMaterial(new Color(0.96f, 0.96f, 0.96f), 0.2f);

            if (helmetNavyMaterial == null)
                helmetNavyMaterial = MakeMaterial(new Color(0.0f, 0.12f, 0.26f), 0.7f);

            if (skinMaterial == null)
                skinMaterial = MakeMaterial(new Color(0.62f, 0.44f, 0.32f), 0.1f); // Indian skin tone
        }

        private void BuildFieldAndPitch()
        {
            if (GameObject.Find("CricketField") != null) return;

            // Outer Green Stadium Field - standard cricket ground, 65m boundary radius on all sides
            GameObject fieldObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            fieldObj.name = "CricketField";
            fieldObj.transform.position = new Vector3(0f, -0.05f, -3.0f);
            fieldObj.transform.localScale = new Vector3(130f, 0.05f, 130f); // 130 = 2 x 65m radius
            fieldObj.GetComponent<Renderer>().sharedMaterial = grassMaterial;

            // White boundary rope line at the 65m edge
            GameObject boundaryRing = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            boundaryRing.name = "BoundaryRope";
            boundaryRing.transform.position = new Vector3(0f, 0.005f, -3.0f);
            boundaryRing.transform.localScale = new Vector3(130.4f, 0.002f, 130.4f);
            Collider boundaryCol = boundaryRing.GetComponent<Collider>();
            if (boundaryCol != null)
            {
                if (Application.isPlaying) Destroy(boundaryCol);
                else DestroyImmediate(boundaryCol);
            }
            boundaryRing.GetComponent<Renderer>().sharedMaterial = whiteLineMaterial;

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

        private void BuildStadiumFloodlights()
        {
            if (GameObject.Find("Floodlights") != null) return;
            GameObject lightsObj = new GameObject("Floodlights");

            Vector3[] towerPositions = new Vector3[]
            {
                new Vector3(-24f, 0f, 20f),
                new Vector3(24f, 0f, 20f),
                new Vector3(-24f, 0f, -25f),
                new Vector3(24f, 0f, -25f)
            };

            foreach (Vector3 pos in towerPositions)
            {
                GameObject tower = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                tower.name = "FloodlightTower";
                tower.transform.SetParent(lightsObj.transform);
                tower.transform.position = pos + new Vector3(0f, 10f, 0f);
                tower.transform.localScale = new Vector3(0.5f, 10f, 0.5f);

                GameObject panel = GameObject.CreatePrimitive(PrimitiveType.Cube);
                panel.name = "LightPanel";
                panel.transform.SetParent(tower.transform);
                panel.transform.localPosition = new Vector3(0f, 0.95f, 0f);
                panel.transform.localScale = new Vector3(3f, 0.1f, 1.5f);
                panel.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 0f, -3f) - pos);
            }
        }

        private void BuildBoundaryAdBoards()
        {
            if (GameObject.Find("BoundaryAdBoards") != null) return;
            GameObject boardsGroup = new GameObject("BoundaryAdBoards");

            int numBoards = 24;
            float radius = 26f;

            for (int i = 0; i < numBoards; i++)
            {
                float angle = i * (360f / numBoards) * Mathf.Deg2Rad;
                Vector3 pos = new Vector3(Mathf.Sin(angle) * radius, 0.4f, Mathf.Cos(angle) * radius - 3f);

                GameObject board = GameObject.CreatePrimitive(PrimitiveType.Cube);
                board.name = $"AdBoard_{i}";
                board.transform.SetParent(boardsGroup.transform);
                board.transform.position = pos;
                board.transform.localScale = new Vector3(4f, 0.8f, 0.2f);
                board.transform.rotation = Quaternion.LookRotation(new Vector3(0f, 0.4f, -3f) - pos);
                board.GetComponent<Renderer>().sharedMaterial = (i % 2 == 0) ? mrfRedMaterial : indiaJerseyMaterial;
            }
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

        private BatController BuildMRFCricketBat()
        {
            GameObject batGroup = new GameObject("3D_MRF_Bat_Group");
            BatController batCtrl = batGroup.AddComponent<BatController>();

            // Handle (Dark grey cane handle)
            GameObject handle = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            handle.name = "BatHandle";
            handle.transform.SetParent(batGroup.transform);
            handle.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            handle.transform.localScale = new Vector3(0.04f, 0.25f, 0.04f);

            // MRF Red Grip Ring Accent
            GameObject ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "MRF_GripRing";
            ring.transform.SetParent(batGroup.transform);
            ring.transform.localPosition = new Vector3(0f, 0.25f, 0f);
            ring.transform.localScale = new Vector3(0.05f, 0.018f, 0.05f);
            ring.GetComponent<Renderer>().sharedMaterial = mrfRedMaterial;

            // Curved English Willow Blade
            GameObject blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
            blade.name = "BatBlade";
            blade.transform.SetParent(batGroup.transform);
            blade.transform.localPosition = new Vector3(0f, -0.15f, 0f);
            blade.transform.localScale = new Vector3(0.12f, 0.72f, 0.05f);
            blade.GetComponent<Renderer>().sharedMaterial = woodMaterial;

            // MRF Genius Sticker Decal Top Header
            GameObject mrfSticker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            mrfSticker.name = "MRF_Genius_Sticker";
            mrfSticker.transform.SetParent(blade.transform);
            mrfSticker.transform.localPosition = new Vector3(0f, 0.35f, -0.52f);
            mrfSticker.transform.localScale = new Vector3(0.95f, 0.25f, 0.06f);
            mrfSticker.GetComponent<Renderer>().sharedMaterial = mrfRedMaterial;

            // Add BoxCollider trigger for bat face
            BoxCollider col = blade.GetComponent<BoxCollider>();
            col.isTrigger = true;

            return batCtrl;
        }

        private void BuildViratKohliBatsman(BatController bat)
        {
            if (GameObject.Find("ViratKohli_Batsman") != null) return;

            GameObject playerObj = new GameObject("ViratKohli_Batsman");
            playerObj.transform.position = bat.transform.position + new Vector3(0.05f, 0f, 0.08f);

            PlayerAnimator animator = playerObj.AddComponent<PlayerAnimator>();
            animator.batController = bat;

            // 1. Torso & Team India Navy Blue Jersey (#18)
            GameObject torso = GameObject.CreatePrimitive(PrimitiveType.Cube);
            torso.name = "JerseyTorso";
            torso.transform.SetParent(playerObj.transform);
            torso.transform.localPosition = new Vector3(0f, 1.05f, 0f);
            torso.transform.localScale = new Vector3(0.38f, 0.50f, 0.22f);
            torso.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;
            animator.torsoTransform = torso.transform;

            // Orange Jersey Trim Accent
            GameObject trim = GameObject.CreatePrimitive(PrimitiveType.Cube);
            trim.name = "OrangeTrim";
            trim.transform.SetParent(torso.transform);
            trim.transform.localPosition = new Vector3(0f, 0.45f, 0f);
            trim.transform.localScale = new Vector3(1.02f, 0.10f, 1.02f);
            trim.GetComponent<Renderer>().sharedMaterial = mrfRedMaterial;

            // 2. Head & Team India Blue Helmet
            GameObject head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "Head";
            head.transform.SetParent(playerObj.transform);
            head.transform.localPosition = new Vector3(0f, 1.45f, 0f);
            head.transform.localScale = new Vector3(0.22f, 0.22f, 0.22f);
            head.GetComponent<Renderer>().sharedMaterial = skinMaterial;
            animator.headTransform = head.transform;

            GameObject helmet = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            helmet.name = "IndiaHelmet";
            helmet.transform.SetParent(head.transform);
            helmet.transform.localPosition = new Vector3(0f, 0.04f, 0f);
            helmet.transform.localScale = new Vector3(1.08f, 1.08f, 1.08f);
            helmet.GetComponent<Renderer>().sharedMaterial = helmetNavyMaterial;

            // Metallic Silver Visor Grille
            GameObject visor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            visor.name = "VisorGrille";
            visor.transform.SetParent(helmet.transform);
            visor.transform.localPosition = new Vector3(0f, -0.15f, -0.45f);
            visor.transform.localScale = new Vector3(0.85f, 0.25f, 0.10f);
            visor.GetComponent<Renderer>().sharedMaterial = whiteLineMaterial;

            // 3. Batting Pads on Legs
            for (int i = -1; i <= 1; i += 2)
            {
                float legX = i * 0.11f;
                GameObject leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                leg.name = $"Leg_{i}";
                leg.transform.SetParent(playerObj.transform);
                leg.transform.localPosition = new Vector3(legX, 0.40f, 0f);
                leg.transform.localScale = new Vector3(0.12f, 0.40f, 0.12f);

                // White Protective Pad
                GameObject pad = GameObject.CreatePrimitive(PrimitiveType.Cube);
                pad.name = $"BattingPad_{i}";
                pad.transform.SetParent(leg.transform);
                pad.transform.localPosition = new Vector3(0f, 0.05f, -0.4f);
                pad.transform.localScale = new Vector3(1.2f, 1.1f, 0.6f);
                pad.GetComponent<Renderer>().sharedMaterial = padWhiteMaterial;

                if (i == -1) animator.leftLegTransform = leg.transform;
                else animator.rightLegTransform = leg.transform;
            }

            // 4. Arms & White Batting Gloves
            for (int i = -1; i <= 1; i += 2)
            {
                float armX = i * 0.24f;
                GameObject arm = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                arm.name = $"Arm_{i}";
                arm.transform.SetParent(playerObj.transform);
                arm.transform.localPosition = new Vector3(armX, 1.05f, 0f);
                arm.transform.localScale = new Vector3(0.08f, 0.25f, 0.08f);
                arm.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;

                // White Batting Glove
                GameObject glove = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                glove.name = $"BattingGlove_{i}";
                glove.transform.SetParent(arm.transform);
                glove.transform.localPosition = new Vector3(0f, -0.9f, 0f);
                glove.transform.localScale = new Vector3(1.4f, 0.5f, 1.4f);
                glove.GetComponent<Renderer>().sharedMaterial = padWhiteMaterial;

                if (i == -1) animator.leftArmTransform = arm.transform;
                else animator.rightArmTransform = arm.transform;
            }

            // Parent Bat to Batsman Player
            bat.transform.SetParent(playerObj.transform);
        }

        private void Build3DBowler(BowlingMachine machine)
        {
            if (GameObject.Find("India_Bowler") != null) return;

            GameObject bowlerObj = new GameObject("India_Bowler");
            bowlerObj.transform.position = new Vector3(0f, 0f, -18.0f);

            BowlerAnimator animator = bowlerObj.AddComponent<BowlerAnimator>();
            animator.bowlingMachine = machine;

            // Torso (India Blue)
            GameObject torso = GameObject.CreatePrimitive(PrimitiveType.Cube);
            torso.name = "BowlerTorso";
            torso.transform.SetParent(bowlerObj.transform);
            torso.transform.localPosition = new Vector3(0f, 1.05f, 0f);
            torso.transform.localScale = new Vector3(0.36f, 0.50f, 0.20f);
            torso.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;

            // Head
            GameObject head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            head.name = "BowlerHead";
            head.transform.SetParent(bowlerObj.transform);
            head.transform.localPosition = new Vector3(0f, 1.45f, 0f);
            head.transform.localScale = new Vector3(0.20f, 0.20f, 0.20f);
            head.GetComponent<Renderer>().sharedMaterial = skinMaterial;

            // Bowling Arm
            GameObject arm = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            arm.name = "BowlingArm";
            arm.transform.SetParent(bowlerObj.transform);
            arm.transform.localPosition = new Vector3(0.22f, 1.15f, 0f);
            arm.transform.localScale = new Vector3(0.08f, 0.28f, 0.08f);
            arm.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;
            animator.bowlingArmTransform = arm.transform;

            // Legs
            for (int i = -1; i <= 1; i += 2)
            {
                float legX = i * 0.10f;
                GameObject leg = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                leg.name = $"BowlerLeg_{i}";
                leg.transform.SetParent(bowlerObj.transform);
                leg.transform.localPosition = new Vector3(legX, 0.40f, 0f);
                leg.transform.localScale = new Vector3(0.10f, 0.40f, 0.10f);
                leg.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;

                if (i == -1) animator.leftLegTransform = leg.transform;
                else animator.rightLegTransform = leg.transform;
            }
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
