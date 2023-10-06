import React , {useState, useEffect, useRef} from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { db } from "/src/firebase";
import { getDocs, collection, addDoc, GeoPoint, deleteDoc, doc} from "firebase/firestore"; // Import the necessary Firestore functions

import Confirm from '../messages/Confirm';
import Success from "../messages/Success"
import GarbageBinForm from "../forms/GarbageBinForm"


const containerStyle = {
  width: '950px',
  height: '500px'
};

const center = {
  lat: 24.7136,
  lng: 46.6753
};

function Map() {

  
  const [garbageBins, setGarbageBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmationVisible, setConfirmationVisible] = useState(false); // To control confirmation message visibility
  const [newGarbageBinLocation, setNewGarbageBinLocation] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showAlertDeletion, setShowAlertDeletion] = useState(false);
 // Define the acceptable zoom level range
 const minZoomLevel = 18;
 const currentZoomLevelRef = useRef(null);
 const mapRef = useRef(null);



  
  const handleConfirm = () => setConfirmationVisible(!confirmationVisible);
  const handlealert = () => setShowAlert(!showAlert);
  const handlealertDeletion = () => setShowAlertDeletion(!showAlertDeletion);

  useEffect( ()=>{
      const fetchGarbageBins = async () => {
      try {
      const querySnapshot = await getDocs(collection(db, "garbageBins"));
      const binsData = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data();
          const location = data.location || {}; // Ensure location is an object
          binsData.push({ id: doc.id, location }); // Include the location field
               });

      setGarbageBins(binsData);
      setLoading(false);
  } catch (error) {
      console.error("Error fetching garbage bins:", error);
  }
                                         };//fetchGarbageBins
fetchGarbageBins();



 },[])
 
 
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyA_uotKtYzbjy44Y2IvoQFds2cCO6VmfMk"
  })

  const [map, setMap] = React.useState(null)

  const onLoad = React.useCallback(function callback(map) {
    console.log("onload");
    mapRef.current = map; // Store the map object in the ref
    
    // Get the initial zoom level and store it in currentZoomLevelRef
    if (map.getZoom) {
      const initialZoomLevel = map.getZoom();
      currentZoomLevelRef.current = initialZoomLevel;
    }
  
    // Attach the onZoomChanged event listener
    if (map.addListener) {
      map.addListener('zoom_changed', onZoomChanged);
    }
  }, []);

  const onUnmount = React.useCallback(function callback(map) {
    console.log("unmount")
    mapRef.current = null;
    setMap(null)
  }, [])

  const [selectedLocation, setSelectedLocation] = React.useState(false);



  const handleMarkerClick = (bin) => {
    setSelectedLocation(bin);
  };

  const onZoomChanged = () => {
    if (mapRef.current && mapRef.current.getZoom) {
      const zoomLevel = mapRef.current.getZoom();
      currentZoomLevelRef.current = zoomLevel;
    }
  };
  
// Attach the onZoomChanged event listener
useEffect(() => {
  if (mapRef.current) {
    mapRef.current.addListener('zoom_changed', onZoomChanged);
  }
}, []);


const onMapClick = (event) => {
  // Capture the coordinates and display a confirmation message
  const lat = event.latLng.lat();
  const lng = event.latLng.lng();
  console.log("Clicked Coordinates:", lat, lng);
console.log(currentZoomLevelRef.current)
  // Check if the conditions are met
  if (currentZoomLevelRef.current >= minZoomLevel) {
    console.log("Adding a garbage bin at this location.");
    setNewGarbageBinLocation({ lat, lng });
    setConfirmationVisible(true);
  } else {
    console.log("Zoom level not sufficient for adding a garbage bin.");
    alert('تحتاج إلى تكبير الخريطة لتتمكن من إضافة حاوية القمامة');
  }
};


  const handleDeleteConfirmation = () => {
   
       // Call the onDeleteGarbageBin function passed as a prop to handle deletion.
      onDeleteGarbageBin(selectedLocation.id);
      setSelectedLocation(false);

  };


  
const saveCoordinatesToFirestore = async (data) => {
  try {
    const geoPoint = new GeoPoint(
      newGarbageBinLocation.lat,
      newGarbageBinLocation.lng
    );
    console.log("GeoPoint:", geoPoint); // Log the GeoPoint before saving

    const docRef = await addDoc(collection(db, "garbageBins"), {
      location: geoPoint,
      size: data.size,
      addedDate: data.date,
    });

    console.log("Document added with ID:", docRef.id); // Log the document ID

    setGarbageBins([...garbageBins, { id: docRef.id, location: geoPoint }]);
    setConfirmationVisible(false);
    setShowAlert(true);

    
  } catch (error) {
    console.error("Error saving garbage bin coordinates:", error);
  }
};


const onDeleteGarbageBin = async (garbageBinId) => {
  try {
    // Construct a reference to the garbage bin document to be deleted
    const garbageBinRef = doc(db, "garbageBins", garbageBinId);

    // Delete the garbage bin document from Firestore
    await deleteDoc(garbageBinRef);

    // Update the state to remove the deleted garbage bin
    setGarbageBins((prevGarbageBins) =>
      prevGarbageBins.filter((bin) => bin.id !== garbageBinId)
    );
     setShowAlertDeletion(true);
    // Display a success message
    
  } catch (error) {
    console.error("Error deleting garbage bin:", error);
    alert("An error occurred while deleting the garbage bin.");
  }
};



  return isLoaded ? (
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad} //Callback function that gets executed when the map is loaded.
        onUnmount={onUnmount}//Callback function that gets executed when the component unmounts.
        onClick={onMapClick}
      >
        {garbageBins.map((bin) => (
          <Marker
            key={bin.id}
            position={{ lat: bin.location._lat, lng: bin.location._long }} // Update here
            onClick={() => handleMarkerClick(bin)}
          >
        
           <Confirm  open={selectedLocation && selectedLocation.id === bin.id} handler={() => setSelectedLocation(false)} method={handleDeleteConfirmation} message="هل انت متأكد من حذف حاوية نفاية بالموقع المحدد؟"/>
           
             
          </Marker>
    ))}
<GarbageBinForm open={confirmationVisible} handler={handleConfirm} method={saveCoordinatesToFirestore}  message="   هل انت متأكد من إضافة حاوية نفاية بالموقع المحدد؟"/>
{/*  
 <Confirm  open={confirmationVisible} handler={handleConfirm} method={saveCoordinatesToFirestore}  message="   هل انت متأكد من إضافة حاوية نفاية بالموقع المحدد؟"/>
   */}
  <Success open={showAlert} handler={handlealert} message=" !تم إضافة حاوية القمامة بنجاح" />
 <Success open={showAlertDeletion} handler={handlealertDeletion} message=" !تم حذف حاوية القمامة بنجاح" />
  
    
        <></>
      </GoogleMap>

  ) : <></>
}

export default React.memo(Map)