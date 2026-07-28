import { seedFirebaseData } from '../features/auth/services/firebaseSeedService';

async function main() {
  console.log('🚀 Iniciando envío de datos de prueba a Firebase Firestore (pos-misdosamores)...');
  const result = await seedFirebaseData();

  if (result.success) {
    console.log(`✅ Datos cargados exitosamente a Firebase! Total registros: ${result.totalRecords}`);
    console.table(result.collections);
    process.exit(0);
  } else {
    console.error('❌ Error al enviar datos a Firebase:', result.error);
    process.exit(1);
  }
}

main();
