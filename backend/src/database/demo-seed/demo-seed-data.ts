/**
 * Fictional Lahore demo data for local development and admin-dashboard testing.
 *
 * Every person, agency, phone number, listing and development project below is
 * invented. A demo account is recognised only when its email, phone and agency
 * name all match the values below; demo projects use the `demo-` slug prefix.
 */
import { AgentVerificationStatus } from '../../modules/users/schemas/user.schema';
import {
  AreaUnit,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
} from '../../modules/properties/schemas/property.schema';
import { DevelopmentProjectStatus } from '../../modules/projects/schemas/development-project.schema';

export const DEMO_PROJECT_SLUG_PREFIX = 'demo-';
export const DEMO_CITY = 'Lahore';

const photo = (id: string, size = 'w=1200&h=800') =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&${size}&q=80`;
const avatar = (id: string) => photo(id, 'w=400&h=400');

const IMG = {
  house1: photo('1600585154340-be6161a56a0c'),
  house2: photo('1600596542815-ffad4c1539a9'),
  house3: photo('1600607687939-ce8a6c25118c'),
  house4: photo('1580587771525-78b9dba3b914'),
  house5: photo('1512917774080-9991f1c4c750'),
  house6: photo('1564013799919-ab600027ffc6'),
  house7: photo('1570129477492-45c003edd2be'),
  house8: photo('1582407947304-fd86f028f716'),
  house9: photo('1613490493576-7fde63acd811'),
  house10: photo('1449844908441-8829872d2607'),
  house11: photo('1628624747186-a941c476b7ef'),
  house12: photo('1604014237800-1c9102c219da'),
  flat1: photo('1545324418-cc1a3fa10c00'),
  flat2: photo('1522708323590-d24dbb6b0267'),
  flat3: photo('1502672260266-1c1ef2d93688'),
  flat4: photo('1560448204-e02f11c3d0e2'),
  flat5: photo('1460317442991-0ec209397118'),
  flat6: photo('1567496898669-ee935f5f647a'),
  land1: photo('1500382017468-9049fed747ef'),
  land2: photo('1541888946425-d81bb19240f5'),
  land3: photo('1503387762-592deb58ef4e'),
  office1: photo('1497366216548-37526070297c'),
  office2: photo('1486406146926-c627a92ad1ab'),
  shop1: photo('1441986300917-64674bd600d8'),
  shop2: photo('1555396273-367ea4eb4db5'),
  estate: photo('1560518883-ce09059eeffa'),
};

export interface DemoAgentSeed {
  key: string;
  name: string;
  email: string;
  phone: string;
  agencyName: string;
  agencyAddress: string;
  avatarUrl: string;
  verificationStatus: AgentVerificationStatus;
}

/**
 * 10 fictional estate agents, all verified with complete public profiles
 * (photo, agency name, office address, phone, city) so they appear in the marketplace.
 */
export const DEMO_AGENTS: DemoAgentSeed[] = [
  {
    key: 'a01',
    name: 'Ahmed Raza Khan',
    email: 'faisal@gmail.com',
    phone: '+923000000101',
    agencyName: 'Raza Estates (Demo)',
    agencyAddress: 'Office 12, Commercial Area, Sector CCA, DHA Phase 6, Lahore',
    avatarUrl: avatar('1507003211169-0a1dd7228f2d'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a02',
    name: 'Sana Malik',
    email: 'faisal1@gmail.com',
    phone: '+923000000102',
    agencyName: 'Malik Property Advisors (Demo)',
    agencyAddress: '2nd Floor, Liberty Arcade, Gulberg III, Lahore',
    avatarUrl: avatar('1494790108377-be9c29b29330'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a03',
    name: 'Usman Tariq',
    email: 'faisal2@gmail.com',
    phone: '+923000000103',
    agencyName: 'Tariq Real Estate (Demo)',
    agencyAddress: 'Shop 7, Commercial Hub, Sector C, Bahria Town, Lahore',
    avatarUrl: avatar('1500648767791-00dcc994a43e'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a04',
    name: 'Ayesha Siddiqui',
    email: 'faisal3@gmail.com',
    phone: '+923000000104',
    agencyName: 'Crescent Realty Consultants (Demo)',
    agencyAddress: '65-G1, Main Boulevard, Johar Town, Lahore',
    avatarUrl: avatar('1438761681033-6461ffad8d80'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a05',
    name: 'Bilal Chaudhry',
    email: 'faisal4@gmail.com',
    phone: '+923000000105',
    agencyName: 'Chaudhry Associates (Demo)',
    agencyAddress: 'Plot 14, Block H-3, Main Market, Wapda Town, Lahore',
    avatarUrl: avatar('1506794778202-cad84cf45f1d'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a06',
    name: 'Kamran Mehmood',
    email: 'faisal5@gmail.com',
    phone: '+923000000106',
    agencyName: 'Lakeview Property Network (Demo)',
    agencyAddress: 'Commercial Block M-2, Lake City, Raiwind Road, Lahore',
    avatarUrl: avatar('1472099645785-5658abf4ff4e'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a07',
    name: 'Zainab Haider',
    email: 'faisal6@gmail.com',
    phone: '+923000000107',
    agencyName: 'Haider Estate Consultants (Demo)',
    agencyAddress: 'Office 4, Y Block Commercial, DHA Phase 3, Lahore',
    avatarUrl: avatar('1544005313-94ddf0286df2'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a08',
    name: 'Hamza Iqbal',
    email: 'faisal7@gmail.com',
    phone: '+923000000108',
    agencyName: 'Iqbal Property Hub (Demo)',
    agencyAddress: 'Askari 11 Commercial Area, Bedian Road, Lahore',
    avatarUrl: avatar('1519085360753-af0119f7cbe7'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a09',
    name: 'Adnan Sheikh',
    email: 'faisal8@gmail.com',
    phone: '+923000000109',
    agencyName: 'Sheikh & Co. Realtors (Demo)',
    agencyAddress: '22-C, Main Boulevard, Model Town Extension, Lahore',
    avatarUrl: avatar('1560250097-0b93528c311a'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
  {
    key: 'a10',
    name: 'Imran Butt',
    email: 'faisal9@gmail.com',
    phone: '+923000000110',
    agencyName: 'Garden Town Realty (Demo)',
    agencyAddress: '9 Abu Bakar Block, Garden Town, Lahore',
    avatarUrl: avatar('1599566150163-29194dcaad36'),
    verificationStatus: AgentVerificationStatus.VERIFIED,
  },
];

export interface DemoPropertySeed {
  agentKey: string;
  title: string;
  description: string;
  purpose: PropertyPurpose;
  propertyType: PropertyType;
  price: number;
  areaSize: number;
  areaUnit: AreaUnit;
  area: string;
  features: Record<string, unknown>;
  images: string[];
  isFeatured?: boolean;
  /** Initial moderation/inventory state, applied only when the listing is first created. */
  initialStatus?: PropertyStatus;
  initialInventoryStatus?: 'available' | 'sold' | 'rented' | 'reserved' | 'unavailable';
}

const plotFeatures = (nearby: string[]) => ({
  bedrooms: 0,
  bathrooms: 0,
  parkingSpaces: 0,
  electricityMeter: false,
  gasConnection: false,
  waterSupply: false,
  community: ['Gated community', 'Security staff', 'Carpeted roads'],
  nearby,
});

const houseFeatures = (
  bedrooms: number,
  bathrooms: number,
  parkingSpaces: number,
  extras: Partial<{ servantQuarter: boolean; furnished: boolean; furnishing: string }> = {},
) => ({
  bedrooms,
  bathrooms,
  parkingSpaces,
  servantQuarter: extras.servantQuarter ?? false,
  furnished: extras.furnished ?? false,
  furnishing: extras.furnishing ?? 'Unfurnished',
  electricityMeter: true,
  gasConnection: true,
  waterSupply: true,
  interior: ['Tiled flooring', 'Fitted kitchen', 'Built-in wardrobes'],
  community: ['Park nearby', 'Mosque nearby', 'Security staff'],
  nearby: ['School', 'Hospital', 'Shopping mall'],
});

const commercialFeatures = (bathrooms: number, parkingSpaces: number, nearby: string[]) => ({
  bedrooms: 0,
  bathrooms,
  parkingSpaces,
  electricityMeter: true,
  gasConnection: false,
  waterSupply: true,
  interior: ['Glass frontage', 'Power backup provision'],
  community: ['Elevator', 'Security staff', '24/7 access'],
  nearby,
});

/**
 * 25 demo listings (2–3 per agent). Shops and offices use the existing
 * `Commercial` property type because the schema has no separate shop value.
 * All listings start as `published` / `available` so they appear in the marketplace.
 */
export const DEMO_PROPERTIES: DemoPropertySeed[] = [
  // a01 — Ahmed Raza Khan (DHA)
  {
    agentKey: 'a01',
    title: '1 Kanal Modern House in DHA Phase 6, Block C',
    description:
      'Brand-new contemporary 1 kanal house on a 50-ft road in DHA Phase 6, Block C. Double-height lounge, five spacious bedrooms with attached baths, a basement home theatre, and a fully fitted Italian kitchen. Solar-ready roof, imported fixtures and a landscaped front lawn. Walking distance to the park and the Phase 6 commercial area.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 125_000_000,
    areaSize: 1,
    areaUnit: AreaUnit.KANAL,
    area: 'DHA Phase 6',
    features: houseFeatures(5, 6, 3, { servantQuarter: true }),
    images: [IMG.house9, IMG.house3, IMG.house2],
    isFeatured: true,
  },
  {
    agentKey: 'a01',
    title: '1 Kanal Residential Plot in DHA Phase 7, Block Y',
    description:
      'Possession-ready 1 kanal residential plot in Block Y, DHA Phase 7. All dues clear, ideal location near the main boulevard with electricity, gas and sewerage work completed in the block. Suitable for immediate construction.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 42_500_000,
    areaSize: 1,
    areaUnit: AreaUnit.KANAL,
    area: 'DHA Phase 7',
    features: plotFeatures(['Main boulevard', 'DHA Raya', 'Lahore Ring Road']),
    images: [IMG.land1, IMG.land3],
  },
  {
    agentKey: 'a01',
    title: '8 Marla Commercial Plot in DHA Phase 8, Broadway',
    description:
      '8 marla commercial plot on Broadway, DHA Phase 8, approved for a ground-plus-seven building. Prime frontage facing heavy footfall, close to the Phase 8 Park View villas and the Ring Road interchange.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 98_000_000,
    areaSize: 8,
    areaUnit: AreaUnit.MARLA,
    area: 'DHA Phase 8',
    features: plotFeatures(['Lahore Ring Road', 'Allama Iqbal International Airport']),
    images: [IMG.land2, IMG.land1],
  },

  // a02 — Sana Malik (Gulberg)
  {
    agentKey: 'a02',
    title: '3 Bed Luxury Apartment in Gulberg III',
    description:
      'Corner 3-bedroom apartment on the 9th floor of a secure residential tower off MM Alam Road. Open-plan living with skyline views, two dedicated parking spaces, standby generator, gym and rooftop terrace access.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.FLAT,
    price: 48_000_000,
    areaSize: 2150,
    areaUnit: AreaUnit.SQFT,
    area: 'Gulberg III',
    features: houseFeatures(3, 3, 2, { furnished: true, furnishing: 'Semi-furnished' }),
    images: [IMG.flat1, IMG.flat3, IMG.flat4],
    isFeatured: true,
  },
  {
    agentKey: 'a02',
    title: 'Ground Floor Shop on MM Alam Road, Gulberg',
    description:
      'Ground-floor retail shop with double-height glass frontage on MM Alam Road. Ideal for a fashion boutique, café or flagship brand store. Currently vacant and ready for fit-out.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.COMMERCIAL,
    price: 85_000_000,
    areaSize: 650,
    areaUnit: AreaUnit.SQFT,
    area: 'Gulberg III',
    features: commercialFeatures(1, 0, ['MM Alam Road', 'Main Market Gulberg']),
    images: [IMG.shop1, IMG.shop2],
  },
  {
    agentKey: 'a02',
    title: '2 Bed Furnished Apartment for Rent in Gulberg II',
    description:
      'Fully furnished 2-bedroom apartment for rent near Main Boulevard Gulberg. Includes air conditioners, appliances, covered parking and 24/7 security. Suitable for professionals or a small family.',
    purpose: PropertyPurpose.RENT,
    propertyType: PropertyType.FLAT,
    price: 185_000,
    areaSize: 1350,
    areaUnit: AreaUnit.SQFT,
    area: 'Gulberg II',
    features: houseFeatures(2, 2, 1, { furnished: true, furnishing: 'Furnished' }),
    images: [IMG.flat2, IMG.flat3],
  },

  // a03 — Usman Tariq (Bahria Town)
  {
    agentKey: 'a03',
    title: '10 Marla House in Bahria Town, Sector C',
    description:
      'Well-maintained 10 marla house in Jasmine Block, Sector C, Bahria Town. Four bedrooms with attached baths, drawing and dining, TV lounge and a covered garage for two cars. Close to Grand Jamia Mosque and the commercial area.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 39_500_000,
    areaSize: 10,
    areaUnit: AreaUnit.MARLA,
    area: 'Bahria Town',
    features: houseFeatures(4, 5, 2),
    images: [IMG.house1, IMG.house6, IMG.house5],
  },
  {
    agentKey: 'a03',
    title: '5 Marla Residential Plot in Bahria Orchard Phase 2',
    description:
      'Developed 5 marla residential plot in Bahria Orchard Phase 2 with possession available. Facing a park, near the main gate and school. Excellent opportunity for an affordable family home.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 7_800_000,
    areaSize: 5,
    areaUnit: AreaUnit.MARLA,
    area: 'Bahria Orchard',
    features: plotFeatures(['Park', 'School', 'Raiwind Road']),
    images: [IMG.land1, IMG.land2],
  },
  {
    agentKey: 'a03',
    title: '5 Marla Double Storey House in Bahria Town',
    description:
      'Brand-new 5 marla double-storey house in Bahria Town, Sector E. Three bedrooms, modern kitchen, tiled flooring and a small front lawn. Near the park and the commercial market.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 21_500_000,
    areaSize: 5,
    areaUnit: AreaUnit.MARLA,
    area: 'Bahria Town',
    features: houseFeatures(3, 4, 1),
    images: [IMG.house7, IMG.house12],
  },

  // a04 — Ayesha Siddiqui (Johar Town)
  {
    agentKey: 'a04',
    title: 'Commercial Shop on Main Boulevard, Johar Town',
    description:
      'Ground-floor shop in a busy plaza on Main Boulevard Johar Town, near Emporium Mall. Steady footfall, tenant-ready with separate electricity meter. Ideal for retail, pharmacy or a mobile store.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.COMMERCIAL,
    price: 32_000_000,
    areaSize: 400,
    areaUnit: AreaUnit.SQFT,
    area: 'Johar Town',
    features: commercialFeatures(1, 0, ['Emporium Mall', 'Expo Centre']),
    images: [IMG.shop2, IMG.shop1],
  },
  {
    agentKey: 'a04',
    title: '7 Marla House in Johar Town, Block R',
    description:
      'Solid-construction 7 marla house in Johar Town, Block R. Three bedrooms, TV lounge, separate drawing room and a car porch. Walking distance to the canal road and major schools.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 27_500_000,
    areaSize: 7,
    areaUnit: AreaUnit.MARLA,
    area: 'Johar Town',
    features: houseFeatures(3, 4, 1),
    images: [IMG.house10, IMG.house4],
  },

  // a05 — Bilal Chaudhry (Wapda Town)
  {
    agentKey: 'a05',
    title: '1 Kanal House in Wapda Town Phase 1',
    description:
      'Spacious 1 kanal house in Wapda Town Phase 1, Block H-3. Five bedrooms, two lounges, a large front lawn and servant quarter. Quiet street near the mosque and park.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 68_000_000,
    areaSize: 1,
    areaUnit: AreaUnit.KANAL,
    area: 'Wapda Town',
    features: houseFeatures(5, 5, 2, { servantQuarter: true }),
    images: [IMG.house8, IMG.house2],
  },
  {
    agentKey: 'a05',
    title: '10 Marla Residential Plot in Wapda Town Phase 2',
    description:
      'Corner 10 marla residential plot in Wapda Town Phase 2 with all utilities available in the block. Clear title and transfer-ready.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 19_500_000,
    areaSize: 10,
    areaUnit: AreaUnit.MARLA,
    area: 'Wapda Town',
    features: plotFeatures(['Raiwind Road', 'Wapda Town roundabout']),
    images: [IMG.land3, IMG.land1],
  },
  {
    agentKey: 'a05',
    title: 'Office Floor for Rent in Wapda Town Commercial',
    description:
      'Fully finished office floor in a new commercial building in Wapda Town. Open floor plate, central air conditioning provision, elevator access and dedicated parking. Suitable for a software house or corporate office.',
    purpose: PropertyPurpose.RENT,
    propertyType: PropertyType.COMMERCIAL,
    price: 350_000,
    areaSize: 3200,
    areaUnit: AreaUnit.SQFT,
    area: 'Wapda Town',
    features: commercialFeatures(2, 6, ['Raiwind Road', 'Banks', 'Restaurants']),
    images: [IMG.office1, IMG.office2],
  },

  // a06 — Kamran Mehmood (Lake City)
  {
    agentKey: 'a06',
    title: '1 Kanal Residential Plot in Lake City, Sector M-3',
    description:
      'Possession-ready 1 kanal plot in Sector M-3, Lake City, close to the lake and golf course. All development completed, ideal for building a luxury family home.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 36_000_000,
    areaSize: 1,
    areaUnit: AreaUnit.KANAL,
    area: 'Lake City',
    features: plotFeatures(['Golf course', 'Lake', 'Raiwind Road']),
    images: [IMG.land1, IMG.land2],
  },
  {
    agentKey: 'a06',
    title: '10 Marla Designer House in Lake City',
    description:
      'Designer 10 marla house in Lake City, Sector M-1 with modern elevation, four bedrooms, imported kitchen and a rooftop terrace overlooking the greenbelt.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 52_000_000,
    areaSize: 10,
    areaUnit: AreaUnit.MARLA,
    area: 'Lake City',
    features: houseFeatures(4, 5, 2),
    images: [IMG.house11, IMG.house1, IMG.house3],
    isFeatured: true,
  },

  // a07 — Zainab Haider (DHA)
  {
    agentKey: 'a07',
    title: '2 Bed Apartment in DHA Phase 5 Commercial',
    description:
      'Modern 2-bedroom apartment above the Phase 5 commercial zone in DHA. Elevator, backup generator, covered parking and close proximity to cafés and the Phase 5 park.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.FLAT,
    price: 26_500_000,
    areaSize: 1250,
    areaUnit: AreaUnit.SQFT,
    area: 'DHA Phase 5',
    features: houseFeatures(2, 2, 1),
    images: [IMG.flat4, IMG.flat2],
  },
  {
    agentKey: 'a07',
    title: '4 Marla Commercial Building in DHA Phase 3, Y Block',
    description:
      '4 marla commercial building with ground, mezzanine and three upper floors in Y Block, DHA Phase 3. Fully rented with stable monthly income — a strong investment opportunity.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.COMMERCIAL,
    price: 145_000_000,
    areaSize: 4,
    areaUnit: AreaUnit.MARLA,
    area: 'DHA Phase 3',
    features: commercialFeatures(5, 2, ['Y Block Market', 'Banks', 'Restaurants']),
    images: [IMG.office2, IMG.estate],
    isFeatured: true,
  },

  // a08 — Hamza Iqbal (Askari / Cantt)
  {
    agentKey: 'a08',
    title: '3 Bed Apartment in Askari 11',
    description:
      'Well-kept 3-bedroom apartment in Askari 11, Sector B. Secure gated community with a park, mosque, school and community centre. Lift access and reserved parking.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.FLAT,
    price: 24_000_000,
    areaSize: 1600,
    areaUnit: AreaUnit.SQFT,
    area: 'Askari 11',
    features: houseFeatures(3, 3, 1),
    images: [IMG.flat5, IMG.flat1],
  },
  {
    agentKey: 'a08',
    title: '1 Kanal House for Rent in Cantt',
    description:
      'Elegant 1 kanal house for rent in Lahore Cantt with four bedrooms, a large lawn and servant quarter. Calm neighbourhood close to Fortress Stadium and main roads.',
    purpose: PropertyPurpose.RENT,
    propertyType: PropertyType.HOUSE,
    price: 450_000,
    areaSize: 1,
    areaUnit: AreaUnit.KANAL,
    area: 'Cantt',
    features: houseFeatures(4, 5, 3, { servantQuarter: true }),
    images: [IMG.house5, IMG.house8],
  },
  {
    agentKey: 'a08',
    title: '5 Marla Plot in Askari 11, Sector D',
    description:
      '5 marla residential plot in Askari 11, Sector D. Located on a wide road near the park with possession available. Ideal for an investment or small family home.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 14_500_000,
    areaSize: 5,
    areaUnit: AreaUnit.MARLA,
    area: 'Askari 11',
    features: plotFeatures(['Bedian Road', 'Park', 'School']),
    images: [IMG.land2, IMG.land3],
  },

  // a09 — Adnan Sheikh (Model Town)
  {
    agentKey: 'a09',
    title: '2 Kanal House in Model Town, Block G',
    description:
      'Classic 2 kanal house in Model Town Block G on a tree-lined street. Six bedrooms, three lounges, a large lawn and generous parking. Suitable for renovation or rebuild.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.HOUSE,
    price: 210_000_000,
    areaSize: 2,
    areaUnit: AreaUnit.KANAL,
    area: 'Model Town',
    features: houseFeatures(6, 6, 4, { servantQuarter: true }),
    images: [IMG.house4, IMG.house10],
  },
  {
    agentKey: 'a09',
    title: 'Corner Shop in Model Town Link Road',
    description:
      'Corner shop on Model Town Link Road with two-sided frontage and a basement for storage. High visibility on a busy commercial road.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.COMMERCIAL,
    price: 38_000_000,
    areaSize: 3,
    areaUnit: AreaUnit.MARLA,
    area: 'Model Town',
    features: commercialFeatures(1, 0, ['Model Town Link Road', 'Kalma Chowk']),
    images: [IMG.shop1, IMG.estate],
  },

  // a10 — Imran Butt (Garden Town)
  {
    agentKey: 'a10',
    title: '2 Bed Apartment for Sale in Garden Town',
    description:
      'Bright 2-bedroom apartment in Garden Town near Kalma Chowk. Covered parking, lift and standby generator. Close to Gaddafi Stadium and Liberty Market.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.FLAT,
    price: 17_500_000,
    areaSize: 1100,
    areaUnit: AreaUnit.SQFT,
    area: 'Garden Town',
    features: houseFeatures(2, 2, 1),
    images: [IMG.flat6, IMG.flat5],
  },
  {
    agentKey: 'a10',
    title: '10 Marla Residential Plot in Valencia Town',
    description:
      '10 marla residential plot in Valencia Town, Block A on a 40-ft road. Developed block with possession, near the main gate and commercial area.',
    purpose: PropertyPurpose.SALE,
    propertyType: PropertyType.PLOT,
    price: 23_000_000,
    areaSize: 10,
    areaUnit: AreaUnit.MARLA,
    area: 'Valencia Town',
    features: plotFeatures(['Raiwind Road', 'Thokar Niaz Baig']),
    images: [IMG.land3, IMG.land1],
  },
];

export interface DemoProjectSeed {
  slug: string;
  name: string;
  developer: string;
  shortDescription: string;
  description: string;
  location: string;
  projectType: string;
  categories: string[];
  priceRange: string;
  status: DevelopmentProjectStatus;
  coverImage: string;
  gallery: string[];
  amenities: string[];
  additionalInformation: Record<string, string>;
  paymentPlan: Record<string, unknown>;
  /** Publication state, applied only when the project is first created. */
  initialIsPublished: boolean;
  initialIsFeatured: boolean;
  initialDisplayOrder: number;
}

export const DEMO_PROJECTS: DemoProjectSeed[] = [
  {
    slug: 'demo-saffron-heights-gulberg',
    name: 'Saffron Heights',
    developer: 'Saffron Developers (Demo)',
    shortDescription:
      'A 22-storey luxury apartment tower in Gulberg III with skyline views, a rooftop pool and serviced amenities.',
    description:
      'Saffron Heights is a 22-storey residential tower in the heart of Gulberg III, minutes from MM Alam Road and Liberty Market. The project offers 1, 2 and 3-bedroom apartments plus a limited collection of duplex penthouses. Residents enjoy a rooftop infinity pool, gymnasium, children\'s play area, three-level basement parking and 24/7 concierge security. Construction is under way with structure work above the 12th floor.',
    location: 'Gulberg III, Lahore',
    projectType: 'High-rise apartments',
    categories: ['Apartments', 'Penthouses'],
    priceRange: 'PKR 18,500,000 – PKR 95,000,000',
    status: DevelopmentProjectStatus.LAUNCHED,
    coverImage: IMG.flat1,
    gallery: [IMG.flat1, IMG.flat3, IMG.flat4, IMG.flat2],
    amenities: ['Rooftop pool', 'Gymnasium', 'Concierge', 'Basement parking', 'Backup power', 'CCTV security'],
    additionalInformation: {
      Floors: '22',
      Units: '240 apartments',
      'Expected possession': 'December 2028',
    },
    paymentPlan: {
      enabled: true,
      title: '3-Year Quarterly Installment Plan',
      totalPrice: 18_500_000,
      bookingAmount: 1_850_000,
      confirmationAmount: 925_000,
      downPaymentPercentage: 15,
      downPaymentAmount: 2_775_000,
      installmentDuration: '3 years',
      installmentFrequency: 'Quarterly',
      milestones: [
        { title: 'Booking', amount: 1_850_000, dueAfter: 'At booking' },
        { title: 'Confirmation', amount: 925_000, dueAfter: '30 days' },
        { title: 'Grey structure completion', amount: 1_850_000, dueAfter: '24 months' },
      ],
      possessionAmount: 1_850_000,
      notes: 'Plan shown for a 1-bedroom apartment. Larger units follow the same percentages.',
    },
    initialIsPublished: true,
    initialIsFeatured: true,
    initialDisplayOrder: 1,
  },
  {
    slug: 'demo-lakeshore-courtyard-villas',
    name: 'Lakeshore Courtyard Villas',
    developer: 'Northbridge Developments (Demo)',
    shortDescription:
      'A gated community of 10 marla and 1 kanal villas in Lake City with private courtyards and lake-facing parks.',
    description:
      'Lakeshore Courtyard Villas is a low-density gated community inside Lake City, Raiwind Road. Each villa is designed around a private landscaped courtyard, with 10 marla and 1 kanal layouts, double-height living spaces and energy-efficient construction. The community includes a clubhouse, jogging track around the lake, a mosque and underground electrification.',
    location: 'Lake City, Raiwind Road, Lahore',
    projectType: 'Gated villa community',
    categories: ['Houses', 'Villas'],
    priceRange: 'PKR 48,000,000 – PKR 98,000,000',
    status: DevelopmentProjectStatus.AVAILABLE,
    coverImage: IMG.house9,
    gallery: [IMG.house9, IMG.house11, IMG.house3, IMG.house1],
    amenities: ['Clubhouse', 'Jogging track', 'Mosque', 'Underground electricity', 'Gated security', 'Parks'],
    additionalInformation: {
      'Total villas': '180',
      'Villa sizes': '10 Marla, 1 Kanal',
      'Ready units': '64',
    },
    paymentPlan: {
      enabled: true,
      title: '2-Year Monthly Installment Plan',
      totalPrice: 48_000_000,
      bookingAmount: 4_800_000,
      downPaymentPercentage: 25,
      downPaymentAmount: 12_000_000,
      installmentDuration: '2 years',
      installmentFrequency: 'Monthly',
      milestones: [
        { title: 'Booking', amount: 4_800_000, dueAfter: 'At booking' },
        { title: 'Balance of down payment', amount: 7_200_000, dueAfter: '60 days' },
      ],
      possessionAmount: 4_800_000,
      notes: 'Ready villas are available for immediate possession on full payment.',
    },
    initialIsPublished: true,
    initialIsFeatured: true,
    initialDisplayOrder: 2,
  },
  {
    slug: 'demo-canal-gate-business-square',
    name: 'Canal Gate Business Square',
    developer: 'Canal Gate Properties (Demo)',
    shortDescription:
      'A mixed retail and office complex on Canal Road near Johar Town with shops, offices and a food court.',
    description:
      'Canal Gate Business Square is a planned commercial complex on Canal Road adjoining Johar Town. The ground and first floors are dedicated to retail shops and brand outlets, the second floor to a food court, and the upper floors to corporate offices. Bookings open soon with an introductory pre-launch price.',
    location: 'Canal Road, Johar Town, Lahore',
    projectType: 'Commercial complex',
    categories: ['Shops', 'Offices', 'Food court'],
    priceRange: 'From PKR 12,000,000',
    status: DevelopmentProjectStatus.COMING_SOON,
    coverImage: IMG.office2,
    gallery: [IMG.office2, IMG.office1, IMG.shop1, IMG.shop2],
    amenities: ['Food court', 'Escalators', 'High-speed elevators', 'Basement parking', 'Central air conditioning'],
    additionalInformation: {
      Floors: 'Ground + 9',
      'Retail floors': '2',
      'Launch window': 'Q2 2027',
    },
    paymentPlan: {
      enabled: true,
      title: '4-Year Pre-Launch Plan',
      totalPrice: 12_000_000,
      bookingAmount: 1_200_000,
      downPaymentPercentage: 20,
      downPaymentAmount: 2_400_000,
      installmentDuration: '4 years',
      installmentFrequency: 'Bi-Annual',
      milestones: [
        { title: 'Booking', amount: 1_200_000, dueAfter: 'At booking' },
        { title: 'Allocation', amount: 1_200_000, dueAfter: '6 months' },
      ],
      possessionAmount: 1_200_000,
      notes: 'Indicative pre-launch pricing for a 250 sq ft first-floor shop.',
    },
    initialIsPublished: true,
    initialIsFeatured: false,
    initialDisplayOrder: 3,
  },
  {
    slug: 'demo-emerald-meadows-enclave',
    name: 'Emerald Meadows Enclave',
    developer: 'Emerald Land Developers (Demo)',
    shortDescription:
      'A new housing society off Bedian Road offering 5 marla to 1 kanal residential plots and commercial plots.',
    description:
      'Emerald Meadows Enclave is a planned housing society off Bedian Road, a short drive from DHA Phase 6 and the Lahore Ring Road. The master plan includes residential plots from 5 marla to 1 kanal, a commercial boulevard, schools, a hospital site, a central park and a grand mosque. Development work including roads and boundary wall is in progress.',
    location: 'Bedian Road, near DHA Phase 6, Lahore',
    projectType: 'Housing society',
    categories: ['Residential Plots', 'Commercial Plots'],
    priceRange: 'PKR 5,500,000 – PKR 22,000,000',
    status: DevelopmentProjectStatus.LAUNCHED,
    coverImage: IMG.land1,
    gallery: [IMG.land1, IMG.land2, IMG.land3],
    amenities: ['Central park', 'Grand mosque', 'School sites', 'Hospital site', 'Commercial boulevard', 'Gated entry'],
    additionalInformation: {
      'Total area': '1,200 Kanal',
      'Plot sizes': '5 Marla, 10 Marla, 1 Kanal',
      'NOC status': 'Applied',
    },
    paymentPlan: {
      enabled: true,
      title: '5-Year Monthly Installment Plan',
      totalPrice: 5_500_000,
      bookingAmount: 550_000,
      downPaymentPercentage: 10,
      downPaymentAmount: 550_000,
      installmentDuration: '5 years',
      installmentFrequency: 'Monthly',
      milestones: [
        { title: 'Booking', amount: 550_000, dueAfter: 'At booking' },
        { title: 'Balloting', amount: 275_000, dueAfter: '12 months' },
      ],
      possessionAmount: 550_000,
      notes: 'Plan shown for a 5 marla residential plot.',
    },
    initialIsPublished: true,
    initialIsFeatured: false,
    initialDisplayOrder: 4,
  },
  {
    slug: 'demo-cantonment-crown-residences',
    name: 'Cantonment Crown Residences',
    developer: 'Crown Habitat Builders (Demo)',
    shortDescription:
      'Completed boutique apartments and ground-floor shops in Lahore Cantt, ready for immediate possession.',
    description:
      'Cantonment Crown Residences is a completed 12-storey mixed-use building in Lahore Cantt. The upper floors contain 2 and 3-bedroom apartments with balconies, while the ground floor hosts retail shops. All units are ready for immediate possession with completed utilities, lifts and a dedicated parking podium.',
    location: 'Cantt, Lahore',
    projectType: 'Mixed-use building',
    categories: ['Apartments', 'Shops'],
    priceRange: 'PKR 22,000,000 – PKR 45,000,000',
    status: DevelopmentProjectStatus.COMPLETED,
    coverImage: IMG.flat5,
    gallery: [IMG.flat5, IMG.flat6, IMG.flat2],
    amenities: ['Lifts', 'Parking podium', 'Backup power', 'Community hall', 'CCTV security'],
    additionalInformation: {
      Floors: '12',
      'Completion year': '2025',
      Possession: 'Immediate',
    },
    paymentPlan: { enabled: false, milestones: [] },
    initialIsPublished: true,
    initialIsFeatured: false,
    initialDisplayOrder: 5,
  },
];
