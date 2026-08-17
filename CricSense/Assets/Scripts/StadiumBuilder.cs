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

        public void ClearOldProceduralObjects()
        {
            string[] objectNames = new string[] { 
                "ViratKohli_Batsman", "India_Bowler", "3D_MRF_Bat_Group", "3D_Bat_Group",
                "CricketField", "BoundaryRope", "BoundaryAdBoards", "Floodlights"
            };
            foreach (string name in objectNames)
            {
                GameObject obj = GameObject.Find(name);
                if (obj != null)
                {
                    // Check if it's an old procedural object without GLB child
                    if (obj.transform.Find("IndianPlayer_3D_Model") == null && obj.transform.Find("MRF_Bat_3D_Model") == null)
                    {
                        if (Application.isPlaying) Destroy(obj);
                        else DestroyImmediate(obj);
                    }
                }
            }
        }

        public void BuildEnvironmentIfMissing()
        {
            // 0. Clear old procedural blocky fallbacks
            ClearOldProceduralObjects();

            // 1. Create Materials
            CreateDefaultMaterials();

            // 2. Build Stadium Field, Pitch & Floodlights
            BuildFieldAndPitch();

            // Only build procedural floodlights/ad boards if GLB stadium is not loaded
            if (GameObject.Find("Narendra_Modi_Stadium_3D") == null)
            {
                BuildStadiumFloodlights();
                BuildBoundaryAdBoards();
            }

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
                indiaJerseyMaterial = MakeMaterial(new Color(0.02f, 0.20f, 0.45f), 0.4f);

            if (mrfRedMaterial == null)
                mrfRedMaterial = MakeMaterial(new Color(0.88f, 0.11f, 0.28f), 0.6f);

            if (padWhiteMaterial == null)
                padWhiteMaterial = MakeMaterial(new Color(0.96f, 0.96f, 0.96f), 0.2f);

            if (helmetNavyMaterial == null)
                helmetNavyMaterial = MakeMaterial(new Color(0.0f, 0.12f, 0.26f), 0.7f);

            if (skinMaterial == null)
                skinMaterial = MakeMaterial(new Color(0.62f, 0.44f, 0.32f), 0.1f);
        }

        private void EnsureURPMaterials(GameObject targetObj)
        {
            if (targetObj == null) return;
            Renderer[] renderers = targetObj.GetComponentsInChildren<Renderer>(true);
            Shader urpShader = GetShader();

            foreach (Renderer rend in renderers)
            {
                rend.enabled = true;
                Material[] mats = rend.sharedMaterials;
                for (int i = 0; i < mats.Length; i++)
                {
                    if (mats[i] == null || mats[i].shader == null || mats[i].shader.name == "Standard" || mats[i].shader.name.Contains("Error") || mats[i].shader.name.Contains("InternalError"))
                    {
                        Material newMat = new Material(urpShader);
                        if (mats[i] != null && mats[i].HasProperty("_MainTex"))
                        {
                            newMat.mainTexture = mats[i].mainTexture;
                        }
                        else
                        {
                            newMat.color = new Color(0.2f, 0.45f, 0.25f);
                        }
                        mats[i] = newMat;
                    }
                }
                rend.sharedMaterials = mats;
            }
        }

        private void BuildFieldAndPitch()
        {
            // 1. ALWAYS build green grass ground plane & pitch strip
            if (GameObject.Find("CricketField") == null)
            {
                GameObject fieldObj = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                fieldObj.name = "CricketField";
                fieldObj.transform.position = new Vector3(0f, -0.05f, -3.0f);
                fieldObj.transform.localScale = new Vector3(130f, 0.05f, 130f);
                fieldObj.GetComponent<Renderer>().sharedMaterial = grassMaterial;
            }

            if (GameObject.Find("PitchStrip") == null)
            {
                GameObject pitchObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
                pitchObj.name = "PitchStrip";
                pitchObj.transform.position = new Vector3(0f, 0.001f, -3.25f);
                pitchObj.transform.localScale = new Vector3(3.0f, 0.01f, 16.5f);
                pitchObj.GetComponent<Renderer>().sharedMaterial = pitchMaterial;

                CreateCreaseLine(new Vector3(0f, 0.005f, 2.7f), new Vector3(2.4f, 0.005f, 0.08f));
                CreateCreaseLine(new Vector3(0f, 0.005f, -10.0f), new Vector3(2.4f, 0.005f, 0.08f));
            }

            // 2. Instantiate Narendra Modi Stadium 3D Model
            if (GameObject.Find("Narendra_Modi_Stadium_3D") == null)
            {
                GameObject stadiumAsset = LoadModelPrefab("Assets/Models/narendra_modi_stadium__low_poly__game_ready.glb");
                if (stadiumAsset != null)
                {
                    GameObject stadiumObj = Instantiate(stadiumAsset);
                    stadiumObj.name = "Narendra_Modi_Stadium_3D";
                    stadiumObj.transform.position = new Vector3(0f, -0.1f, -3.0f);
                    stadiumObj.transform.rotation = Quaternion.identity;
                    stadiumObj.transform.localScale = Vector3.one;

                    EnsureURPMaterials(stadiumObj);
                }
            }
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

        private GameObject LoadModelPrefab(string path)
        {
#if UNITY_EDITOR
            return UnityEditor.AssetDatabase.LoadAssetAtPath<GameObject>(path);
#else
            return null;
#endif
        }

        private BatController BuildMRFCricketBat()
        {
            GameObject batGroup = new GameObject("3D_MRF_Bat_Group");
            batGroup.transform.position = new Vector3(0.28f, 0.62f, 2.85f);
            batGroup.transform.rotation = Quaternion.Euler(-35f, 20f, 0f);

            BatController batCtrl = batGroup.AddComponent<BatController>();
            batCtrl.isLeftHanded = false; // Right-Handed batsman default

            GameObject batModelAsset = LoadModelPrefab("Assets/Models/mrf_cricket_bat_sports..glb");
            if (batModelAsset != null)
            {
                GameObject batModel = Instantiate(batModelAsset, batGroup.transform);
                batModel.name = "MRF_Bat_3D_Model";
                batModel.transform.localPosition = Vector3.zero;
                batModel.transform.localRotation = Quaternion.identity;

                EnsureURPMaterials(batModel);

                // Add BoxCollider trigger for bat blade physics impact
                BoxCollider col = batModel.GetComponentInChildren<BoxCollider>();
                if (col == null)
                {
                    Renderer rend = batModel.GetComponentInChildren<Renderer>();
                    if (rend != null)
                    {
                        col = rend.gameObject.AddComponent<BoxCollider>();
                    }
                    else
                    {
                        col = batGroup.AddComponent<BoxCollider>();
                    }
                }
                col.isTrigger = true;
            }
            else
            {
                // Fallback procedural MRF bat
                GameObject blade = GameObject.CreatePrimitive(PrimitiveType.Cube);
                blade.name = "BatBlade";
                blade.transform.SetParent(batGroup.transform);
                blade.transform.localPosition = new Vector3(0f, -0.15f, 0f);
                blade.transform.localScale = new Vector3(0.12f, 0.72f, 0.05f);
                blade.GetComponent<Renderer>().sharedMaterial = woodMaterial;

                GameObject mrfHeader = GameObject.CreatePrimitive(PrimitiveType.Cube);
                mrfHeader.name = "MRF_Genius_Header";
                mrfHeader.transform.SetParent(blade.transform);
                mrfHeader.transform.localPosition = new Vector3(0f, 0.35f, -0.52f);
                mrfHeader.transform.localScale = new Vector3(0.96f, 0.26f, 0.06f);
                mrfHeader.GetComponent<Renderer>().sharedMaterial = mrfRedMaterial;

                BoxCollider col = blade.GetComponent<BoxCollider>();
                col.isTrigger = true;
            }

            return batCtrl;
        }

        private void BuildViratKohliBatsman(BatController bat)
        {
            if (GameObject.Find("ViratKohli_Batsman") != null) return;

            // Position Right-Handed Batsman outside off-stump / crease line
            Vector3 stancePos = new Vector3(0.28f, 0.0f, 2.85f);
            GameObject playerObj = new GameObject("ViratKohli_Batsman");
            playerObj.transform.position = stancePos;
            playerObj.transform.rotation = Quaternion.Euler(0f, -55f, 0f); // 55° Sideways stance facing bowler

            PlayerAnimator animator = playerObj.AddComponent<PlayerAnimator>();
            animator.batController = bat;

            GameObject playerModelAsset = LoadModelPrefab("Assets/Models/indian_cricket_player_rigged.glb");
            if (playerModelAsset != null)
            {
                GameObject playerModel = Instantiate(playerModelAsset, playerObj.transform);
                playerModel.name = "IndianPlayer_3D_Model";
                playerModel.transform.localPosition = Vector3.zero;
                playerModel.transform.localRotation = Quaternion.identity;

                EnsureURPMaterials(playerModel);

                animator.torsoTransform = playerModel.transform;
                animator.headTransform = playerModel.transform;

                // Parent Bat to Batsman Player
                bat.transform.SetParent(playerObj.transform);
                bat.transform.localPosition = new Vector3(0f, 0.55f, -0.12f);
                bat.transform.localRotation = Quaternion.Euler(-25f, 15f, 0f);
            }
            else
            {
                // Fallback procedural batsman
                GameObject torso = GameObject.CreatePrimitive(PrimitiveType.Cube);
                torso.name = "JerseyTorso";
                torso.transform.SetParent(playerObj.transform);
                torso.transform.localPosition = new Vector3(0f, 0.95f, 0f);
                torso.transform.localScale = new Vector3(0.38f, 0.50f, 0.22f);
                torso.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;
                animator.torsoTransform = torso.transform;

                GameObject head = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                head.name = "Head";
                head.transform.SetParent(playerObj.transform);
                head.transform.localPosition = new Vector3(0f, 1.32f, 0f);
                head.transform.localScale = new Vector3(0.20f, 0.20f, 0.20f);
                head.GetComponent<Renderer>().sharedMaterial = skinMaterial;
                animator.headTransform = head.transform;

                bat.transform.SetParent(playerObj.transform);
                bat.transform.localPosition = new Vector3(0f, 0.55f, -0.12f);
                bat.transform.localRotation = Quaternion.Euler(-25f, 15f, 0f);
            }
        }

        private void Build3DBowler(BowlingMachine machine)
        {
            if (GameObject.Find("India_Bowler") != null) return;

            GameObject bowlerObj = new GameObject("India_Bowler");
            bowlerObj.transform.position = new Vector3(0f, 0f, -18.0f);

            BowlerAnimator animator = bowlerObj.AddComponent<BowlerAnimator>();
            animator.bowlingMachine = machine;

            GameObject bowlerModelAsset = LoadModelPrefab("Assets/Models/indian_cricket_player_rigged.glb");
            if (bowlerModelAsset != null)
            {
                GameObject bowlerModel = Instantiate(bowlerModelAsset, bowlerObj.transform);
                bowlerModel.name = "Bowler_3D_Model";
                bowlerModel.transform.localPosition = Vector3.zero;
                bowlerModel.transform.localRotation = Quaternion.identity;

                EnsureURPMaterials(bowlerModel);

                animator.bowlingArmTransform = bowlerModel.transform;
            }
            else
            {
                GameObject torso = GameObject.CreatePrimitive(PrimitiveType.Cube);
                torso.name = "BowlerTorso";
                torso.transform.SetParent(bowlerObj.transform);
                torso.transform.localPosition = new Vector3(0f, 1.05f, 0f);
                torso.transform.localScale = new Vector3(0.36f, 0.50f, 0.20f);
                torso.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;

                GameObject arm = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                arm.name = "BowlingArm";
                arm.transform.SetParent(bowlerObj.transform);
                arm.transform.localPosition = new Vector3(0.22f, 1.15f, 0f);
                arm.transform.localScale = new Vector3(0.08f, 0.28f, 0.08f);
                arm.GetComponent<Renderer>().sharedMaterial = indiaJerseyMaterial;
                animator.bowlingArmTransform = arm.transform;
            }
        }

        private BowlingMachine BuildBowlingMachine()
        {
            GameObject machineObj = new GameObject("BowlingMachine");
            machineObj.transform.position = new Vector3(0f, 1.8f, -10.0f);
            BowlingMachine machine = machineObj.AddComponent<BowlingMachine>();

            GameObject ballAsset = LoadModelPrefab("Assets/Models/cricket_ball_sports..glb");
            GameObject ballObj;
            if (ballAsset != null)
            {
                ballObj = Instantiate(ballAsset);
                ballObj.name = "CricketBall_Prefab";

                EnsureURPMaterials(ballObj);
                
                SphereCollider col = ballObj.GetComponentInChildren<SphereCollider>();
                if (col == null)
                {
                    col = ballObj.AddComponent<SphereCollider>();
                }
            }
            else
            {
                ballObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                ballObj.name = "CricketBall_Prefab";
                ballObj.transform.localScale = new Vector3(0.18f, 0.18f, 0.18f); // 9cm radius sphere
                ballObj.GetComponent<Renderer>().sharedMaterial = ballMaterial;
            }

            BallPhysics bp = ballObj.GetComponent<BallPhysics>();
            if (bp == null) bp = ballObj.AddComponent<BallPhysics>();
            
            machine.ballPrefab = ballObj;
            ballObj.SetActive(false);

            return machine;
        }
    }
}
