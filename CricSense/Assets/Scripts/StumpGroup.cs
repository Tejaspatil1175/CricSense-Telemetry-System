using UnityEngine;

namespace CricSense
{
    /// <summary>
    /// Manages stumps and bails at either end of the pitch, handling wicket hit physics.
    /// </summary>
    public class StumpGroup : MonoBehaviour
    {
        [Header("Stumps & Bails Reference")]
        public GameObject[] stumps;
        public GameObject[] bails;

        public bool isWicketBroken = false;

        public void TriggerWicket(Vector3 impactVelocity)
        {
            if (isWicketBroken) return;
            isWicketBroken = true;

            // Knock bails loose with physics forces
            if (bails != null)
            {
                foreach (GameObject bail in bails)
                {
                    if (bail != null)
                    {
                        Rigidbody rb = bail.GetComponent<Rigidbody>();
                        if (rb == null) rb = bail.AddComponent<Rigidbody>();

                        rb.isKinematic = false;
                        rb.AddForce(impactVelocity * 0.4f + Vector3.up * 2.5f, ForceMode.Impulse);
                        rb.AddTorque(Random.insideUnitSphere * 10f, ForceMode.Impulse);
                    }
                }
            }

            // Apply impulse force to stumps
            if (stumps != null)
            {
                foreach (GameObject stump in stumps)
                {
                    if (stump != null)
                    {
                        Rigidbody rb = stump.GetComponent<Rigidbody>();
                        if (rb != null)
                        {
                            rb.isKinematic = false;
                            rb.AddForce(impactVelocity * 0.2f, ForceMode.Impulse);
                        }
                    }
                }
            }
        }

        public void ResetStumps()
        {
            isWicketBroken = false;
            // Stumps & bails position reset by StadiumBuilder
        }
    }
}
