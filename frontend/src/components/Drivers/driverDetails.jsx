import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { User, Activity, Heart, Brain, AlertTriangle } from 'lucide-react'
import DriverInfo from "../Post Department/utils/driverCard"


// Mock data for the driver
const driverData = {
  personalInfo: {
    fullName: "John Doe",
    age: 35,
    contact: "+1 234 567 8900",
    email: "john.doe@example.com",
    address: "123 Truck Lane, Driverville, TX 12345",
    license: {
      number: "DL123456789",
      issueDate: "2020-01-01",
      expiryDate: "2025-01-01"
    },
    emergencyContact: {
      name: "Jane Doe",
      phone: "+1 234 567 8901"
    }
  },
  professionalInfo: {
    employeeId: "EMP001",
    experience: 10,
    currentAssignment: {
      truckId: "TRK789",
      route: "Dallas to Houston",
      loadType: "Perishables"
    },
    certifications: ["Hazardous Materials", "Defensive Driving"]
  },
  performanceMetrics: {
    onTimeDeliveries: 95,
    fuelEfficiency: 7.5,
    accidents: 0,
    customerFeedback: 4.8
  },
  healthInfo: {
    lastCheckup: "2023-05-15",
    bmi: 24.5,
    sleepAvg: 7.2
  },
  moralStatus: {
    complianceScore: 98,
    peerReviewScore: 4.7,
    psychAssessment: "Stable",
    moodTracking: {
      happy: 70,
      neutral: 20,
      stressed: 10
    }
  },
  riskIndicators: {
    fatigueRisk: "Low",
    stressLevel: "Medium",
    burnoutPotential: "Low"
  }
}

const colorCodes = {
  excellent: "bg-green-500",
  good: "bg-blue-500",
  satisfactory: "bg-yellow-500",
  concern: "bg-red-500"
}

// Card Component
const Card = ({ children, className }) => (
  <div className={`border shadow-sm rounded-lg bg-[#020073] text-white ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children }) => (
  <div className="border-b p-4">
    {children}
  </div>
)

const CardTitle = ({ children }) => (
  <h2 className="text-lg font-bold">{children}</h2>
)

const CardContent = ({ children, className }) => (
  <div className={`p-4 ${className}`}>
    {children}
  </div>
)

// Badge Component
const Badge = ({ children, className, variant = "default" }) => (
  <span className={`px-2 py-1 rounded text-white text-xs ${className}`}>
    {children}
  </span>
)

// Progress Component
const Progress = ({ value }) => (
  <div className="w-full bg-gray-200 rounded h-2">
    <div className="bg-blue-600 h-2 rounded" style={{ width: `${value}%` }} />
  </div>
)

// Tabs Component
const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)
  return (
    <>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab, setActiveTab })
      )}
    </>
  )
}

const TabsList = ({ children, activeTab, setActiveTab }) => (
  <div className="flex space-x-4 border-b">
    {React.Children.map(children, (child) =>
      React.cloneElement(child, { activeTab, setActiveTab })
    )}
  </div>
)

const TabsTrigger = ({ children, value, activeTab, setActiveTab }) => (
  <button
    className={`p-2 border-b-2 ${activeTab === value ? 'border-blue-600' : 'border-transparent'}`}
    onClick={() => setActiveTab(value)}
  >
    {children}
  </button>
)

const TabsContent = ({ children, value, activeTab }) => {
  if (value !== activeTab) return null
  return <div>{children}</div>
}

// Avatar Component
const Avatar = ({ children, className }) => (
  <div className={`rounded-full ${className}`}>
    {children}
  </div>
)

const AvatarImage = ({ src, alt }) => (
  <img src={src} alt={alt} className="rounded-full object-cover" />
)

const AvatarFallback = ({ children }) => (
  <div className="rounded-full bg-gray-300 text-center text-white">{children}</div>
)








export default function DriverDetailsPage() {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Driver Details</h1>
        <Badge className={colorCodes.excellent}>Excellent Standing</Badge>
      </header>

      <div className="grid grid-cols-[60%_30%] gap-10">
        <DriverInfo/>
        

        <Card>
          <CardHeader>
            <CardTitle>Professional Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Employee ID:</strong> {driverData.professionalInfo.employeeId}</p>
            <p><strong>Experience:</strong> {driverData.professionalInfo.experience} years</p>
            <p><strong>Current Assignment:</strong> {driverData.professionalInfo.currentAssignment.route}</p>
            <p><strong>Truck ID:</strong> {driverData.professionalInfo.currentAssignment.truckId}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance"><Activity className="mr-[4vw] h-4 w-4" /> Performance</TabsTrigger>
          <TabsTrigger value="health"><Heart className="mr-[4vw] h-4 w-4" /> Health</TabsTrigger>
          <TabsTrigger value="moral"><Brain className="mr-[4vw] h-4 w-4" /> Moral Status</TabsTrigger>
          <TabsTrigger value="risk"><AlertTriangle className="mr-[4vw] h-4 w-4" /> Risk Indicators</TabsTrigger>
        </TabsList>
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>On-time Deliveries</span>
                  <span>{driverData.performanceMetrics.onTimeDeliveries}%</span>
                </div>
                <Progress value={driverData.performanceMetrics.onTimeDeliveries} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Fuel Efficiency</span>
                  <span>{driverData.performanceMetrics.fuelEfficiency} mpg</span>
                </div>
                <Progress value={driverData.performanceMetrics.fuelEfficiency * 10} />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Customer Feedback</span>
                  <span>{driverData.performanceMetrics.customerFeedback}/5</span>
                </div>
                <Progress value={driverData.performanceMetrics.customerFeedback * 20} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Health Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Last Checkup:</strong> {driverData.healthInfo.lastCheckup}</p>
              <p><strong>BMI:</strong> {driverData.healthInfo.bmi}</p>
              <p><strong>Average Sleep:</strong> {driverData.healthInfo.sleepAvg} hours</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="moral">
          <Card>
            <CardHeader>
              <CardTitle>Moral Status</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-between">
              <div className="space-y-2">
                <p><strong>Compliance Score:</strong> {driverData.moralStatus.complianceScore}%</p>
                <p><strong>Peer Review Score:</strong> {driverData.moralStatus.peerReviewScore}/5</p>
                <p><strong>Psychological Assessment:</strong> {driverData.moralStatus.psychAssessment}</p>
              </div>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={Object.entries(driverData.moralStatus.moodTracking).map(([key, value]) => ({ name: key, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell key="cell-0" fill="#4CAF50" />
                    <Cell key="cell-1" fill="#FFC107" />
                    <Cell key="cell-2" fill="#F44336" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Fatigue Risk:</strong> <Badge variant={driverData.riskIndicators.fatigueRisk === 'Low' ? 'default' : 'destructive'}>{driverData.riskIndicators.fatigueRisk}</Badge></p>
              <p><strong>Stress Level:</strong> <Badge variant={driverData.riskIndicators.stressLevel === 'Low' ? 'default' : 'destructive'}>{driverData.riskIndicators.stressLevel}</Badge></p>
              <p><strong>Burnout Potential:</strong> <Badge variant={driverData.riskIndicators.burnoutPotential === 'Low' ? 'default' : 'destructive'}>{driverData.riskIndicators.burnoutPotential}</Badge></p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
