import { PrismaClient, UserRole, UserStatus, VehicleType, EmploymentStatus, DutyStatus, ContractStatus, PricingModel, ShiftType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CITIES_AND_AREAS = [
  'المهندسين', 'الدقي', 'ميدان التحرير', 'مصر الجديدة', 'مدينة نصر', 'المعادي',
  'التجمع الخامس', 'التجمع الأول', 'الرحاب', 'مدينتي', 'الشروق', 'العبور',
  'شبرا الخيمة', 'شبرا مصر', 'الهرم', 'فيصل', 'حدائق الأهرام', '6 أكتوبر (الحصري)',
  '6 أكتوبر (المنطقة الصناعية)', 'الشيخ زايد (هايبر وان)', 'الشيخ زايد (بيفرلي هيلز)',
  'حلوان', 'المعصرة', 'المقطم', 'زهراء المعادي', 'القرية الذكية (Smart Village)',
  'العاصمة الإدارية الجديدة', 'مدينة بدر', 'عين شمس', 'الزيتون'
];

const EGYPTIAN_FIRST_NAMES = [
  'أحمد', 'محمد', 'محمود', 'مصطفى', 'إبراهيم', 'علي', 'حسن', 'حسين', 'خالد', 'طارق',
  'سامح', 'شريف', 'عادل', 'كريم', 'هاني', 'ياسر', 'هشام', 'عمرو', 'وليد', 'إيهاب',
  'أشرف', 'علاء', 'مدحت', 'ماجد', 'رامي', 'تامر', 'وائل', 'حازم', 'عصام', 'أيمن'
];

const EGYPTIAN_LAST_NAMES = [
  'حسن', 'إبراهيم', 'عبد الفتاح', 'الشريف', 'السيد', 'عثمان', 'الباز', 'منصور', 'راضي',
  'الشناوي', 'فوزي', 'سليمان', 'جاد', 'سعيد', 'عبد الرازق', 'خليل', 'رمضان', 'شحاتة',
  'النجار', 'سلامة', 'الصاوي', 'يوسف', 'البدري', 'زهران', 'الفيومي', 'المهدي', 'علام',
  'فرج', 'حمزة', 'شعلان'
];

const VEHICLE_MODELS = [
  { make: 'Toyota', model: 'Coaster 2024', type: VehicleType.MINIBUS_30_SEATER, capacity: 30 },
  { make: 'Toyota', model: 'HiAce 2023', type: VehicleType.VAN_14_SEATER, capacity: 14 },
  { make: 'King Long', model: 'XMQ6900 2024', type: VehicleType.BUS_50_SEATER, capacity: 50 },
  { make: 'Golden Dragon', model: 'Triumphant 2024', type: VehicleType.MINIBUS_30_SEATER, capacity: 33 },
  { make: 'Mercedes-Benz', model: 'Tourismo 2023', type: VehicleType.BUS_50_SEATER, capacity: 50 },
  { make: 'Chevrolet', model: 'Move 2023', type: VehicleType.VAN_14_SEATER, capacity: 8 },
  { make: 'Nissan', model: 'Urvan 2024', type: VehicleType.VAN_14_SEATER, capacity: 14 },
  { make: 'Hyundai', model: 'H-1 2023', type: VehicleType.VAN_14_SEATER, capacity: 12 },
];

const ARABIC_LETTERS = ['أ', 'ب', 'ج', 'د', 'س', 'ص', 'ط', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي', 'ر', 'ز'];

function getRandomPlate(index: number) {
  const l1 = ARABIC_LETTERS[index % ARABIC_LETTERS.length];
  const l2 = ARABIC_LETTERS[(index * 3) % ARABIC_LETTERS.length];
  const l3 = ARABIC_LETTERS[(index * 7) % ARABIC_LETTERS.length];
  const num = 1000 + (index * 37) % 8999;
  return `${l1} ${l2} ${l3} ${num}`;
}

async function seedEnterpriseDemo() {
  console.log('====================================================================');
  console.log('🌟 STARTING COMPLETE DEMO ENTERPRISE SEEDING (100 DRIVERS & 100 VEHICLES)');
  console.log('====================================================================\n');

  try {
    // 1. Clean existing records in strict referential order
    console.log('🧹 1. Clearing old test data...');
    await prisma.tripPassenger.deleteMany();
    await prisma.tripEvent.deleteMany();
    await prisma.financeLine.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.treasuryEntry.deleteMany();
    await prisma.treasuryAccount.deleteMany();
    await prisma.dailyOperation.deleteMany();
    await prisma.driverOvertime.deleteMany();
    await prisma.driverSettlement.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.staffPayroll.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.clientTransaction.deleteMany();
    await prisma.supplierTransaction.deleteMany();
    await prisma.financialPeriod.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.servicePlan.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.passenger.deleteMany();
    await prisma.routeStop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.contractVehicle.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.site.deleteMany();
    await prisma.driverDocument.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.partner.deleteMany();
    await prisma.client.deleteMany();

    console.log('   ✅ Database cleared successfully.');

    // 2. Ensure Admin and Operations User
    console.log('\n👤 2. Ensuring Default Admin Accounts...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@ontime.com' },
      create: {
        email: 'admin@ontime.com',
        fullName: 'المدير العام (ON TIME Admin)',
        phone: '01000000001',
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.ADMIN,
      },
    });
    console.log(`   ✅ Admin User ready: [admin@ontime.com / admin123]`);

    // 3. Create 3 Treasury Accounts
    console.log('\n🏦 3. Setting up Treasury Accounts (Cash & Banks)...');
    const cashVault = await prisma.treasuryAccount.create({
      data: {
        name: 'الخزينة النقدية الرئيسية (Main Cash Vault)',
        kind: 'CASH',
        currency: 'EGP',
        openingDate: new Date('2026-01-01'),
        entries: {
          create: {
            date: new Date('2026-01-01'),
            amount: 250000,
            kind: 'IN',
            reference: 'رصيد افتتاحي تأسيسي',
            notes: 'افتتاح الخزينة الرئيسية',
            actorId: adminUser.id,
            requestKey: `INIT_CASH_${Date.now()}`,
            fingerprint: 'INIT_CASH',
          },
        },
      },
    });

    const banqueMisr = await prisma.treasuryAccount.create({
      data: {
        name: 'بنك مصر - حساب جاري رئيسي (Banque Misr)',
        kind: 'BANK',
        bankName: 'Banque Misr',
        reference: 'EG120002000100000012345678',
        currency: 'EGP',
        openingDate: new Date('2026-01-01'),
        entries: {
          create: {
            date: new Date('2026-01-01'),
            amount: 1500000,
            kind: 'IN',
            reference: 'رصيد افتتاحي بنك مصر',
            notes: 'افتتاح الحساب البنكي الجاري',
            actorId: adminUser.id,
            requestKey: `INIT_MISR_${Date.now()}`,
            fingerprint: 'INIT_MISR',
          },
        },
      },
    });

    const cibBank = await prisma.treasuryAccount.create({
      data: {
        name: 'البنك التجاري الدولي (CIB - Operations Account)',
        kind: 'BANK',
        bankName: 'CIB Egypt',
        reference: 'EG120003000200000098765432',
        currency: 'EGP',
        openingDate: new Date('2026-01-01'),
        entries: {
          create: {
            date: new Date('2026-01-01'),
            amount: 1000000,
            kind: 'IN',
            reference: 'رصيد افتتاحي CIB',
            notes: 'حساب تشغيل ومصروفات الأسطول',
            actorId: adminUser.id,
            requestKey: `INIT_CIB_${Date.now()}`,
            fingerprint: 'INIT_CIB',
          },
        },
      },
    });
    console.log('   ✅ 3 Treasury Accounts created (Total Liquidity: 2,750,000 EGP).');

    // 4. Create 5 Corporate Clients
    console.log('\n🏢 4. Creating 5 Egyptian Corporate Clients...');
    const CLIENTS_DATA = [
      {
        companyName: 'شركة فودافون مصر (Vodafone Egypt)',
        contactPerson: 'أ/ سامح عبد العزيز (مدير النقل والخدمات)',
        phone: '01001112233',
        email: 'transport@vodafone.com.eg',
        address: 'القرية الذكية - الكيلو 28 طريق مصر إسكندرية الصحراوي',
        taxId: '200-145-891',
        monthlyValue: 450000,
        sites: ['القرية الذكية C1', 'مبنى المعادي سيتي سنتر', 'مبنى 6 أكتوبر'],
      },
      {
        companyName: 'الشركة المصرية للاتصالات (Telecom Egypt - WE)',
        contactPerson: 'م/ طارق المنشاوي (مدير قطاع الحركة والتشغيل)',
        phone: '01223344556',
        email: 'fleet.ops@te.eg',
        address: 'القرية الذكية - مبنى B12 - الجيزة',
        taxId: '200-884-102',
        monthlyValue: 520000,
        sites: ['المبنى الرئيسي بالقرية الذكية', 'سنترال رمسيس', 'سنترال الأوبرا والمهندسين'],
      },
      {
        companyName: 'شركة كونسنتريكس لخدمات التعهيد (Concentrix Egypt)',
        contactPerson: 'أ/ مريم الشاذلي (Facility & Transport Lead)',
        phone: '01114455667',
        email: 'transport.eg@concentrix.com',
        address: 'التجمع الخامس - مجمع البنوك - القاهرة الجديدة',
        taxId: '305-671-920',
        monthlyValue: 380000,
        sites: ['فرع التجمع الخامس (Plaza)', 'فرع المعادي التكنولوجية', 'فرع المهندسين'],
      },
      {
        companyName: 'مجموعة راية القابضة (Raya Holding)',
        contactPerson: 'أ/ وائل زهران (Operations & Logistics Manager)',
        phone: '01099887766',
        email: 'fleet@rayacorp.com',
        address: 'مدينة 6 أكتوبر - المنطقة الصناعية الثالثة',
        taxId: '210-449-331',
        monthlyValue: 340000,
        sites: ['مقر 6 أكتوبر الإداري', 'مبنى راية بالمعادي', 'مصنع التجميع بالعبور'],
      },
      {
        companyName: 'شركة جهينة للصناعات الغذائية (Juhayna Food Industries)',
        contactPerson: 'م/ حسام الدين فراج (مدير إدارة الموارد والنقل)',
        phone: '01288776655',
        email: 'transport@juhayna.com',
        address: 'مدينة 6 أكتوبر - المحور المركزي - مجمع المصانع',
        taxId: '219-550-144',
        monthlyValue: 410000,
        sites: ['مجمع مصانع 6 أكتوبر (مصنع المروة والرضوى)', 'المقر الإداري بالدقي', 'فرع العاشر من رمضان'],
      },
    ];

    const createdClients: any[] = [];
    const createdContracts: any[] = [];

    for (const [idx, cData] of CLIENTS_DATA.entries()) {
      const client = await prisma.client.create({
        data: {
          companyName: cData.companyName,
          contactPerson: cData.contactPerson,
          phone: cData.phone,
          email: cData.email,
          address: cData.address,
          taxId: cData.taxId,
          notes: 'عميل استراتيجي - تعاقد سنوي شامل',
        },
      });

      // Create sites
      for (const sName of cData.sites) {
        await prisma.site.create({
          data: {
            name: sName,
            clientId: client.id,
            address: `${sName} - ${cData.address}`,
          },
        });
      }

      // Create Contract
      const contract = await prisma.contract.create({
        data: {
          clientId: client.id,
          contractNumber: `CNT-2026-${(idx + 1).toString().padStart(3, '0')}`,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2027-12-31'),
          status: ContractStatus.ACTIVE,
          assignedVehicleCount: 20,
          pricingModel: PricingModel.PER_TRIP,
          monthlyValue: cData.monthlyValue,
          notes: 'عقد نقل موظفين وورديات دورية بالرحلة',
        },
      });

      createdClients.push(client);
      createdContracts.push(contract);
      console.log(`   ✅ Client #${idx + 1}: ${client.companyName} (Contract: ${contract.contractNumber})`);
    }

    // 5. Create 5 Transport Suppliers (شركاء النقل والموردين)
    console.log('\n🤝 5. Creating 5 Transport Suppliers (Partners)...');
    const SUPPLIERS_DATA = [
      { name: 'شركة الإيمان للنقل السياحي والرحلات', contact: 'الحاج إبراهيم منصور', phone: '01012345671', email: 'aleman.transport@gmail.com' },
      { name: 'شركة البراق للخدمات اللوجستية والأسطول', contact: 'كابتن أشرف عبد الله', phone: '01123456782', email: 'alboraq.fleet@yahoo.com' },
      { name: 'شركة النيل للرحلات والنقل الجماعي', contact: 'أ/ محمد النجار', phone: '01234567893', email: 'nile.tours.eg@gmail.com' },
      { name: 'شركة الصفا لخدمات النقل والليموزين', contact: 'م/ عصام الشريف', phone: '01098765434', email: 'alsafa.transport@outlook.com' },
      { name: 'العالمية لنقل الموظفين والشركات', contact: 'أ/ هاني غنيم', phone: '01187654325', email: 'global.transport.eg@gmail.com' },
    ];

    const createdSuppliers: any[] = [];
    for (const [idx, sData] of SUPPLIERS_DATA.entries()) {
      const supplier = await prisma.partner.create({
        data: {
          name: sData.name,
          kind: 'TRANSPORT',
          contactName: sData.contact,
          phone: sData.phone,
          email: sData.email,
          notes: 'مورد أسطول وسيارات خارجية معتمد',
        },
      });
      createdSuppliers.push(supplier);
      console.log(`   ✅ Supplier #${idx + 1}: ${supplier.name}`);
    }

    // 6. Create 100 Drivers (50 Company + 50 Suppliers)
    console.log('\n👨‍✈️ 6. Creating 100 Drivers (50 Company Fleet + 50 External Suppliers)...');
    const createdDrivers: any[] = [];

    for (let i = 0; i < 100; i++) {
      const isCompany = i < 50;
      const supplier = isCompany ? null : createdSuppliers[i % 5];
      const firstName = EGYPTIAN_FIRST_NAMES[i % EGYPTIAN_FIRST_NAMES.length];
      const middleName = EGYPTIAN_LAST_NAMES[(i * 3) % EGYPTIAN_LAST_NAMES.length];
      const lastName = EGYPTIAN_LAST_NAMES[(i * 7) % EGYPTIAN_LAST_NAMES.length];
      const fullName = `كابتن ${firstName} ${middleName} ${lastName}`;
      const phone = `01${(i % 3 === 0 ? '0' : i % 3 === 1 ? '1' : '2')}${Math.floor(10000000 + (i * 876543) % 89999999)}`;
      const nationalId = `2${(75 + (i % 25)).toString()}${(1 + (i % 12)).toString().padStart(2, '0')}${(1 + (i % 28)).toString().padStart(2, '0')}${(10000 + i * 137).toString()}`;
      const licenseNum = `DL-${(200000 + i * 543).toString()}`;

      const driver = await prisma.driver.create({
        data: {
          fullName,
          phoneNumber: phone,
          nationalId,
          licenseNumber: licenseNum,
          licenseExpirationDate: new Date('2028-12-31'),
          employmentStatus: EmploymentStatus.ACTIVE,
          dutyStatus: DutyStatus.AVAILABLE,
          supplierId: supplier?.id || null,
        },
      });
      createdDrivers.push(driver);
    }
    console.log(`   ✅ 100 Drivers successfully created (50 Company + 50 Suppliers).`);

    // 7. Create 100 Vehicles (50 Company + 50 Suppliers)
    console.log('\n🚌 7. Creating 100 Vehicles (50 Company Fleet + 50 External Suppliers)...');
    const createdVehicles: any[] = [];

    for (let i = 0; i < 100; i++) {
      const isCompany = i < 50;
      const supplier = isCompany ? null : createdSuppliers[i % 5];
      const modelTemplate = VEHICLE_MODELS[i % VEHICLE_MODELS.length];
      const plateNumber = getRandomPlate(i + 1);

      const vehicle = await prisma.vehicle.create({
        data: {
          plateNumber,
          make: modelTemplate.make,
          model: modelTemplate.model,
          manufacturingYear: 2022 + (i % 4),
          vehicleType: modelTemplate.type,
          capacity: modelTemplate.capacity,
          currentMileage: 12000 + (i * 3500) % 80000,
          insuranceExpiry: new Date('2028-12-31'),
          licenseExpiry: new Date('2028-12-31'),
          inspectionExpiry: new Date('2028-12-31'),
          supplierId: supplier?.id || null,
          assignedDriver: {
            connect: { id: createdDrivers[i].id },
          },
        },
      });
      createdVehicles.push(vehicle);
    }
    console.log(`   ✅ 100 Vehicles successfully created and paired 1:1 with drivers.`);

    // 8. Create 100 Routes (20 Routes per Client)
    console.log('\n🛣️ 8. Creating 100 Routes (20 Routes for each of the 5 Clients)...');
    const createdRoutes: any[] = [];

    for (let cIdx = 0; cIdx < 5; cIdx++) {
      const client = createdClients[cIdx];
      const clientName = client.companyName.split(' ')[1] || 'الشركة';

      for (let rIdx = 0; rIdx < 20; rIdx++) {
        const globalRouteIndex = cIdx * 20 + rIdx;
        const startArea = CITIES_AND_AREAS[(globalRouteIndex * 2) % CITIES_AND_AREAS.length];
        const destArea = CITIES_AND_AREAS[(globalRouteIndex * 2 + 5) % CITIES_AND_AREAS.length];
        const routeNum = 100 + globalRouteIndex + 1;
        const routeName = `خط (${routeNum}) ${startArea} ⟵⟶ ${destArea} [${clientName}]`;

        const isSupplierRoute = globalRouteIndex >= 50;
        const defaultVehicle = createdVehicles[globalRouteIndex];
        const defaultDriver = createdDrivers[globalRouteIndex];
        const supplier = defaultVehicle.supplierId ? createdSuppliers.find((s) => s.id === defaultVehicle.supplierId) : null;

        // Realistic Pricing
        const clientPrice = 1200 + ((globalRouteIndex * 70) % 1800); // 1,200 - 3,000 EGP
        const driverAllowance = 300 + ((globalRouteIndex * 30) % 400); // 300 - 700 EGP
        const supplierCost = isSupplierRoute ? Math.round(clientPrice * 0.75) : 0; // Supplier takes 75%
        const vehicleCost = isSupplierRoute ? 0 : 250; // Fuel & depreciation

        const route = await prisma.route.create({
          data: {
            clientId: client.id,
            routeName,
            startLocation: startArea,
            finalDestination: destArea,
            estimatedDistanceKm: 25 + (globalRouteIndex % 35),
            estimatedDurationMin: 40 + (globalRouteIndex % 45),
            clientPricePerTrip: clientPrice,
            driverTripAllowance: driverAllowance,
            supplierCostPerTrip: supplierCost,
            vehicleRentalCost: vehicleCost,
            executionType: isSupplierRoute ? 'SUPPLIER' : 'COMPANY',
            supplierId: supplier?.id || null,
            defaultVehicleId: defaultVehicle.id,
            defaultDriverId: defaultDriver.id,
            stops: {
              create: [
                { stopOrder: 1, stopName: `محطة البداية: ${startArea}`, pickupTimeOffsetMin: 0 },
                { stopOrder: 2, stopName: `محطة وسيطة: محطة مترو / ميدان رئيسي`, pickupTimeOffsetMin: 15 },
                { stopOrder: 3, stopName: `محطة وسيطة 2: محور 26 يوليو / الدائري`, pickupTimeOffsetMin: 30 },
                { stopOrder: 4, stopName: `محطة الوصول: ${destArea}`, pickupTimeOffsetMin: 45 },
              ],
            },
          },
        });
        createdRoutes.push(route);
      }
      console.log(`   ✅ 20 Routes created for Client: ${client.companyName}`);
    }

    console.log('\n====================================================================');
    console.log('🎉 ENTERPRISE DEMO SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================================');
    console.log(`• 🏢 Clients: 5 corporate enterprises with active contracts`);
    console.log(`• 🤝 Suppliers: 5 transport contractor partners`);
    console.log(`• 👨‍✈️ Drivers: 100 drivers (50 Company + 50 Suppliers)`);
    console.log(`• 🚌 Vehicles: 100 vehicles (50 Company + 50 Suppliers)`);
    console.log(`• 🛣️ Routes: 100 routes with stops & pricing (20 per client)`);
    console.log(`• 🏦 Treasury: 3 accounts (Cash & Banks with 2.75M EGP liquidity)`);
    console.log(`• 👤 Login Credentials: admin@ontime.com / admin123\n`);

  } catch (error: any) {
    console.error('❌ SEEDING FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedEnterpriseDemo();
