import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase.js';

const ANAMNESES_COLLECTION = 'anamneses';

/**
 * Adds a new anamnesis form for a specific patient to Firestore.
 * 
 * @param {string} patientId - The ID of the patient this anamnesis belongs to.
 * @param {Object} anamnesisData - The anamnesis form data.
 * @param {string} anamnesisData.familyHistory - Patient's family medical history.
 * @param {string} anamnesisData.mainComplaint - The main complaint or reason for visit.
 * @param {string} anamnesisData.initialObservations - Any initial observations by the professional.
 * @returns {Promise<string>} The ID of the newly created anamnesis document.
 */
export async function addAnamnesis(patientId, anamnesisData) {
  try {
    if (!patientId) throw new Error("patientId is required to add an anamnesis form.");

    const docRef = await addDoc(collection(db, ANAMNESES_COLLECTION), {
      patientId,
      ...anamnesisData,
      createdAt: serverTimestamp()
    });
    console.log("Anamnesis added with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding anamnesis: ", e);
    throw e;
  }
}

/**
 * Retrieves all anamnesis forms for a specific patient.
 * 
 * @param {string} patientId - The patient's document ID.
 * @returns {Promise<Array>} List of anamnesis records for the patient.
 */
export async function getAnamnesesByPatientId(patientId) {
  try {
    const q = query(
      collection(db, ANAMNESES_COLLECTION),
      where("patientId", "==", patientId)
    );

    const querySnapshot = await getDocs(q);
    const anamneses = [];
    querySnapshot.forEach((doc) => {
      anamneses.push({ id: doc.id, ...doc.data() });
    });
    return anamneses;
  } catch (e) {
    console.error("Error fetching anamneses for patient: ", e);
    throw e;
  }
}
