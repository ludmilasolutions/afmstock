export const CONFIG = {
  SUPABASE_URL: 'https://dkswhmujymvsbosghrsd.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrc3dobXVqeW12c2Jvc2docnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mjc2MTIsImV4cCI6MjA4ODQwMzYxMn0.Om8EGGwy7XGm_5uqScyDxWW2xaUuloqZf-v5Yfl76cQ'
};

export const SPECIALTIES_DEFAULT = [
  'Plomería','Electricidad','Gas','Carpintería','Pintura','Albañilería',
  'Refrigeración','Aire Acondicionado','Herrería','Cerrajería','Jardinería',
  'Limpieza','Informática','TV / Electrónica','Mudanzas','Fumigación',
  'Impermeabilización','Soldadura','Techista','Tapicería'
];

export const PROVINCES = [
  'Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán',
  'Salta', 'Neuquén', 'Entre Ríos', 'Chaco', 'Corrientes'
];

export const ADS_DEFAULT = [
  {title:'¿Sos profesional? ¡Destacate aquí!',description:'Llegá a miles de clientes en tu zona. Suscribite a TECNIYA Destacado.',level:'nacional',link:'#'},
  {title:'Ferretería El Tornillo - Todo para tu obra',description:'Materiales de calidad a precios accesibles. Envío a domicilio.',level:'nacional',link:'#'},
];

export const MOCK_PROS = [
  {id:'p1',name:'Carlos Méndez',specialty:'Plomería',city:'Buenos Aires',province:'Buenos Aires',description:'Plomero con 15 años de experiencia. Reparación urgente de cañerías, instalaciones sanitarias, calefones y más.',rating:4.8,reviews_count:127,jobs_count:243,is_featured:true,is_certified:true,is_online:true,zones:['Palermo','Belgrano','Recoleta'],whatsapp:'+5491112345678'},
  {id:'p2',name:'María González',specialty:'Electricidad',city:'Córdoba',province:'Córdoba',description:'Electricista matriculada. Instalaciones residenciales y comerciales, tableros, iluminación LED.',rating:4.9,reviews_count:89,jobs_count:167,is_featured:true,is_certified:true,is_online:false,zones:['Centro','Nueva Córdoba','Güemes'],whatsapp:'+5493511234567'},
  {id:'p3',name:'Rodrigo Fernández',specialty:'Gas',city:'Rosario',province:'Santa Fe',description:'Gasista matriculado. Instalación y mantenimiento de equipos a gas. Urgencias 24hs.',rating:4.7,reviews_count:65,jobs_count:134,is_featured:false,is_certified:true,is_online:true,zones:['Centro','Pichincha','Fisherton'],whatsapp:'+5493414567890'},
  {id:'p4',name:'Laura Sánchez',specialty:'Pintura',city:'Mendoza',province:'Mendoza',description:'Pintora de interiores y exteriores. Estucados, texturados y acabados especiales.',rating:4.6,reviews_count:43,jobs_count:98,is_featured:false,is_certified:false,is_online:true,zones:['Ciudad','Godoy Cruz','Guaymallén'],whatsapp:'+5492614123456'},
  {id:'p5',name:'Juan Torres',specialty:'Carpintería',city:'Buenos Aires',province:'Buenos Aires',description:'Carpintero a medida. Muebles, aberturas, reparaciones. Trabajo en madera maciza y melamina.',rating:4.5,reviews_count:31,jobs_count:72,is_featured:true,is_certified:false,is_online:false,zones:['San Telmo','La Boca','Barracas'],whatsapp:'+5491187654321'},
  {id:'p6',name:'Roberto Díaz',specialty:'Refrigeración',city:'Tucumán',province:'Tucumán',description:'Técnico en aire acondicionado y heladeras. Reparación, mantenimiento y carga de gas.',rating:4.4,reviews_count:28,jobs_count:56,is_featured:false,is_certified:true,is_online:true,zones:['Centro','Yerba Buena'],whatsapp:'+5493814567890'},
  {id:'p7',name:'Ana Martínez',specialty:'Albañilería',city:'Córdoba',province:'Córdoba',description:'Albañila con especialización en reformas de baño y cocina. Colocación de cerámicos y porcellanato.',rating:4.7,reviews_count:52,jobs_count:104,is_featured:false,is_certified:false,is_online:true,zones:['Alberdi','Villa del Parque','Talleres'],whatsapp:'+5493512987654'},
  {id:'p8',name:'Pedro López',specialty:'Herrería',city:'Buenos Aires',province:'Buenos Aires',description:'Herrero con 20 años. Rejas, puertas, portones, escaleras. Trabajos en hierro y aluminio.',rating:4.3,reviews_count:19,jobs_count:45,is_featured:false,is_certified:false,is_online:false,zones:['Flores','Floresta','Caballito'],whatsapp:'+5491134567890'},
];

export const SUBSCRIPTION_PRICE = 5000;
