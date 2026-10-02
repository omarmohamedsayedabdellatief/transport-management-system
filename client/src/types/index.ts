export type UserRole = 'ADMIN' | 'OPERATIONS_MANAGER' | 'VIEWER' | 'ACCOUNTANT' | 'DRIVER' | 'CLIENT' | 'SUPPLIER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  status: ClientStatus;
  notes?: string;
  contracts?: Contract[];
  _count?: {
    contracts: number;
    routes: number;
    trips: number;
  };
  createdAt: string;
}

export type ContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELLED';
export type PricingModel = 'MONTHLY_FIXED' | 'PER_TRIP' | 'PER_KM' | 'HYBRID';

export interface Contract {
  id: string;
  clientId: string;
  client?: { id: string; companyName: string; contactPerson: string; phone: string };
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  assignedVehicleCount: number;
  pricingModel: PricingModel;
  monthlyValue: number;
  notes?: string;
  contractVehicles?: { id: string; vehicle: Vehicle }[];
  _count?: { trips: number };
  createdAt: string;
}

export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE';
export type VehicleType = 'BUS_50_SEATER' | 'MINIBUS_30_SEATER' | 'VAN_14_SEATER' | 'SEDAN' | 'OTHER';

export interface Partner {
  id: string;
  name: string;
  kind: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  manufacturingYear: number;
  vehicleType: VehicleType;
  capacity: number;
  currentMileage: number;
  status: VehicleStatus;
  insuranceExpiry: string;
  licenseExpiry: string;
  inspectionExpiry: string;
  supplierId?: string | null;
  supplier?: {
    id: string;
    name: string;
    kind?: string;
    phone?: string | null;
  } | null;
  assignedDriver?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    dutyStatus: DutyStatus;
  } | null;
  _count?: {
    trips: number;
    maintenanceRecords: number;
  };
  createdAt: string;
}

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type DutyStatus = 'AVAILABLE' | 'ASSIGNED' | 'ON_DUTY' | 'OFF_DUTY' | 'SUSPENDED';

export interface Driver {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  employmentStatus: EmploymentStatus;
  dutyStatus: DutyStatus;
  supplierId?: string | null;
  supplier?: {
    id: string;
    name: string;
    kind?: string;
    phone?: string | null;
  } | null;
  assignedVehicleId?: string | null;
  assignedVehicle?: Vehicle | null;
  documents?: DriverDocument[];
  _count?: {
    trips: number;
    documents: number;
  };
  createdAt: string;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl: string;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  stopOrder: number;
  stopName: string;
  pickupTimeOffsetMin: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface Route {
  id: string;
  clientId: string;
  client?: { id: string; companyName: string };
  routeName: string;
  startLocation: string;
  finalDestination: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  clientPricePerTrip?: number;
  supplierCostPerTrip?: number;
  executionType?: 'COMPANY' | 'SUPPLIER';
  supplierId?: string | null;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  driverTripAllowance?: number;
  vehicleRentalCost?: number;
  defaultVehicleId?: string | null;
  defaultVehicle?: Vehicle | null;
  defaultDriverId?: string | null;
  defaultDriver?: Driver | null;
  isActive: boolean;
  stops?: RouteStop[];
  _count?: {
    stops: number;
    trips: number;
  };
  createdAt: string;
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'CUSTOM';
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';

export interface Trip {
  id: string;
  tripNumber: string;
  clientId: string;
  client?: { id: string; companyName: string };
  contractId?: string | null;
  contract?: { id: string; contractNumber: string } | null;
  routeId: string;
  route?: {
    id: string;
    routeName: string;
    startLocation: string;
    finalDestination: string;
    clientPricePerTrip?: number;
    supplierCostPerTrip?: number;
    driverTripAllowance?: number;
    vehicleRentalCost?: number;
    executionType?: 'COMPANY' | 'SUPPLIER';
    supplierId?: string | null;
    supplier?: { id: string; name: string } | null;
    stops?: RouteStop[];
  };
  vehicleId: string;
  vehicle?: Vehicle;
  driverId: string;
  driver?: Driver;
  executionType?: 'COMPANY' | 'SUPPLIER';
  supplierId?: string | null;
  supplier?: { id: string; name: string } | null;
  saleAmount?: number;
  costAmount?: number;
  driverAllowance?: number;
  vehicleCost?: number;
  tripDate: string;
  shift: ShiftType;
  scheduledDeparture: string;
  expectedArrival: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  tripStatus: TripStatus;
  notes?: string;
  createdAt: string;
}

export type MaintenanceType =
  | 'OIL_CHANGE'
  | 'TIRES'
  | 'ENGINE'
  | 'MECHANICAL_REPAIR'
  | 'ELECTRICAL_REPAIR'
  | 'PERIODIC_INSPECTION'
  | 'OTHER';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicle?: {
    id: string;
    plateNumber: string;
    make: string;
    model: string;
    currentMileage: number;
    supplierId?: string | null;
    supplier?: { id: string; name: string } | null;
    assignedDriver?: { fullName: string };
  };
  maintenanceType: MaintenanceType;
  serviceDate: string;
  completionDate?: string | null;
  cost: number;
  mileageAtService: number;
  nextMaintenanceDate?: string | null;
  nextMaintenanceMileage?: number | null;
  serviceProvider?: string;
  downtimeHours: number;
  status: MaintenanceStatus;
  description: string;
  invoiceUrl?: string;
  createdAt: string;
}

export interface DashboardKPIs {
  vehicles: {
    total: number;
    available: number;
    assigned: number;
    underMaintenance: number;
  };
  drivers: {
    total: number;
    available: number;
    assigned: number;
  };
  clients: {
    active: number;
  };
  contracts: {
    active: number;
    expiringSoon: number;
  };
  tripsToday: {
    total: number;
    completed: number;
    inProgress: number;
    scheduled: number;
  };
  alerts: {
    expiredContracts?: number;
    expiringContracts: number;
    expiredVehicleDocs?: number;
    expiringVehicleDocs: number;
    expiredDriverLicenses?: number;
    expiringDriverLicenses: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}