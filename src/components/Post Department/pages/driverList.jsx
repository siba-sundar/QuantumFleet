import SideBar from "../../Global/sideBar.jsx"
import DriverDetailsUpdated from "../../Drivers/DriverDetailsUpdated.jsx"
import { useState } from "react"

function DriverPage () {

    const drivers = [
        {
            id: 1,
            driver: "TS44353",
            number: "Shyam Lal",
            status: "Active",
            image:""  
          },
        {
            id: 2,
            driver: "RK98530",
            number: "Ramesh Lal",
            status: "Inactive",
            image:""
        },
        {
            id: 3,
            driver: "GS5T4",
            number: "Praksh lal",
            status: "Pending",
            image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7xLZhTlAMkWQoOC-xX_szjqygyEU2ShZYEg&usqp=CAU"
        },
        {
            id: 4,
            driver: "TR4993K",
            number: "Kumal Tripathi",
            status: "Active",
            image:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7xLZhTlAMkWQoOC-xX_szjqygyEU2ShZYEg&usqp=CAU"
        }
    ];





    const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id)
    const selectedDriver = drivers.find(d => d.id === selectedDriverId) || drivers[0]

    return (
        <>
        <div className="grid grid-cols-[20%_80%]">
            <SideBar trucks={drivers} selectedId={selectedDriverId} onSelect={setSelectedDriverId} />
            <DriverDetailsUpdated />
        </div>
        </>
    )
}




export default DriverPage