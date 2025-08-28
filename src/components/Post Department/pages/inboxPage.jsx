import SideBar from "../../Global/sideBar.jsx"
import InboxContent from "../utils/inboxContent.jsx"
import { useState } from "react"

function InboxPage () {

    const drivers = [
        {
            id: 1,
            driver: "TS44353",
            number: "Shyam Lal",
            status: "Active",
          },
        {
            id: 2,
            driver: "RK98530",
            number: "Ramesh Lal",
            status: "Inactive",
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

    return (
        <>
        <div className="grid grid-cols-[20%_80%]">
            <SideBar trucks={drivers} selectedId={selectedDriverId} onSelect={setSelectedDriverId} />
            <InboxContent selectedDriverId={selectedDriverId} />
        </div>
        </>
    )
}

export default InboxPage