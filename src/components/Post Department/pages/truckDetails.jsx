import Map from "../utils/map.jsx"
import TruckLoad from "../utils/loadDetails.jsx"
import Location from "../utils/loaction.jsx"
import Stats from "../utils/stats.jsx"
import Graph from "../utils/graphComp.jsx"
import DriverCard from '../utils/driverCard.jsx'
import SideBar from "../../Global/sideBar.jsx"
import RouteGraph from "../../../assets/route-graph.svg"
import QR from "../../../assets/QR.svg"
import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'
import api from '../../../utils/api'





function TruckDetails() {

        // trucks will be loaded from backend
        const [trucks, setTrucks] = useState([])
        const [loading, setLoading] = useState(true)

        useEffect(()=>{
            let mounted = true
            api.fetchTrucks()
                .then(list => { if(mounted) setTrucks(list) })
                .catch(()=> { if(mounted) setTrucks([]) })
                .finally(()=> { if(mounted) setLoading(false) })
            return () => mounted = false
        },[])

    const truckLoadPercentage = 80;
    const truckDetails = {
        number: 'MH12 AB1234',
        deliveryStatus: 'In Transit',
        maxLoad: 10000, // Max load in kg
        currentLoad: 8600,
        maintenance: "12-Dec-03", // Current load in kg
    };


    const sampleCheckpoints = [
        { name: 'Checkpoint 1', position: '5%' },
        { name: 'Checkpoint 2', position: '25%' },
        { name: 'Checkpoint 3', position: '45%' },
        { name: 'Checkpoint 4', position: '65%' },
        { name: 'Checkpoint 5', position: '85%' },
    ];



    const dates = [
        { x: new Date('2024-01-01').getTime(), y: 1000000 },
        { x: new Date('2024-02-01').getTime(), y: 1500000 },
        { x: new Date('2024-03-01').getTime(), y: 1200000 },
        // Add more data points as needed
    ];
    

        const [selectedTruckId, setSelectedTruckId] = useState()
        const selectedTruck = trucks.find(t => t.id === selectedTruckId) || trucks[0]
        useEffect(()=>{
            if(trucks.length && selectedTruckId == null){
                setSelectedTruckId(trucks[0].id)
            }
        },[trucks, selectedTruckId])
    const navigate = useNavigate()


    return (
        <>

            <div className='grid grid-cols-[20%_80%]'>
                <SideBar trucks={trucks} selectedId={selectedTruckId} onSelect={setSelectedTruckId} />

                <div className="">
                    <div>
                        <div className="flex gap-4">
                            {loading ? <div>Loading trucks...</div> : <Map trucks={[selectedTruck]} />}
                            <div>
                                <TruckLoad loadPercentage={truckLoadPercentage} truckDetails={truckDetails} />
                                <div className="w-[20%]">
                                    <div className="bg-[#020073] mt-4 rounde-sm w-[18vw] h-[40vh] p-4 rounded-md">
                                        <p className="text-lg text-white font-semibold">Truck QR</p>
                                        <img className="w-full h-full p-8" src={QR} alt="" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex">
                            <div className="w-[70%]">
                                <div
                                 className="w-full"
                                 onClick={() => navigate('/driver-details')}
                                >
                                    <DriverCard />
                                </div>

                                <div className="w-full">
                                    <Graph />
                                </div>

                            </div>


                            <div className="ml-8 mt-4 pl-8">
                                <Location checkpoints={sampleCheckpoints} />
                            </div>
                        </div>
                    </div>





                </div>

            </div>
            </>
            )
}



            export default TruckDetails