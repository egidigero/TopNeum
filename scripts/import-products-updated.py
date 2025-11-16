"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                   IMPORTADOR DE PRODUCTOS - TopNeum                          ║
║                   Versión 2.0 - Con índice de carga separado                ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAPEO DE COLUMNAS CSV → BD                          │
└─────────────────────────────────────────────────────────────────────────────┘

  Columna CSV              Campo DB              Descripción
  ═══════════════════════════════════════════════════════════════════════════
  SKU                      sku                   Código único del producto
  MARCA                    marca                 Marca (YOKOHAMA, PIRELLI, etc)
  FAMILIA                  familia               Familia del producto
  DISEÑO                   diseno                Diseño/línea (ES32, P400, etc)
  MEDIDA                   medida                Medida (185/60R15, 205/55R16)
  INDICE                   indice                Índice (84H, 91V, XL, etc)
  DESCRIPCION LARGA        descripcion_larga     Descripción completa
  COSTO                    costo                 Precio de costo
  3 CUOTAS                 cuota_3               Precio en 3 cuotas
  6 CUOTAS                 cuota_6               Precio en 6 cuotas
  12 CUOTAS                cuota_12              Precio en 12 cuotas
  EFECTIVO BSAS            efectivo_bsas         Precio contado CABA
  EFECTIVO INT             efectivo_int          Precio contado Interior
  FACT MAYORISTA           mayorista_fact        Precio mayorista con factura
  SIN FACT MAYOR           mayorista_sin_fact    Precio mayorista sin factura
  STOCK                    stock                 Stock (OK, número, o vacío)

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EJEMPLO DE FILA CSV                                 │
└─────────────────────────────────────────────────────────────────────────────┘

YOK001,YOKOHAMA,PASAJERO,BLUEARTH ES32,185/60R15,84H,Yokohama BluEarth ES32 
185/60R15 84H,25000,35000,40000,45000,30000,32000,28000,27000,OK

"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import os
from dotenv import load_dotenv
from decimal import Decimal
import sys

# Cargar variables de entorno
load_dotenv()

# Configuración de conexión
DB_CONFIG = {
    'host': os.getenv('POSTGRES_HOST'),
    'database': os.getenv('POSTGRES_DATABASE'),
    'user': os.getenv('POSTGRES_USER'),
    'password': os.getenv('POSTGRES_PASSWORD'),
    'port': os.getenv('POSTGRES_PORT', 5432),
    'sslmode': 'require'
}

def limpiar_precio(valor):
    """Convierte un valor a Decimal, manejando strings, None, vacíos"""
    if pd.isna(valor) or valor == '' or valor is None:
        return None
    
    # Si ya es número, convertir directamente
    if isinstance(valor, (int, float)):
        return Decimal(str(valor))
    
    # Si es string, limpiar
    try:
        valor_limpio = str(valor).strip()
        # Remover símbolos de moneda y espacios
        valor_limpio = valor_limpio.replace('$', '').replace(',', '').replace(' ', '')
        if valor_limpio == '' or valor_limpio == '-':
            return None
        return Decimal(valor_limpio)
    except:
        return None

def limpiar_stock(valor):
    """Normaliza el valor de stock: OK, número, o vacío"""
    if pd.isna(valor) or valor == '' or valor is None:
        return ''
    
    valor_str = str(valor).strip().upper()
    
    # Si es 'OK' o variantes
    if valor_str in ['OK', 'SI', 'SÍ', 'YES', 'S']:
        return 'OK'
    
    # Si es un número
    try:
        numero = int(float(valor_str))
        return str(numero)
    except:
        return ''

def importar_productos(csv_path):
    """Importa productos desde CSV a PostgreSQL"""
    
    print("\n" + "═" * 80)
    print("📂 Leyendo archivo CSV...")
    print(f"   Ruta: {csv_path}")
    print("═" * 80)
    
    # Leer CSV
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding='latin-1')
    
    print(f"\n✅ CSV cargado exitosamente")
    print(f"   📊 Total de filas: {len(df)}")
    
    # Normalizar nombres de columnas (quitar espacios extra)
    df.columns = df.columns.str.strip()
    
    # Verificar columnas requeridas
    columnas_requeridas = [
        'SKU', 'MARCA', 'FAMILIA', 'DISEÑO', 'MEDIDA', 'INDICE',
        'DESCRIPCION LARGA', 'COSTO', '3 CUOTAS', '6 CUOTAS', '12 CUOTAS',
        'EFECTIVO BSAS', 'EFECTIVO INT', 'FACT MAYORISTA', 'SIN FACT MAYOR', 'STOCK'
    ]
    
    columnas_faltantes = [col for col in columnas_requeridas if col not in df.columns]
    if columnas_faltantes:
        print("\n" + "═" * 80)
        print("❌ ERROR: Faltan columnas requeridas")
        print("═" * 80)
        for col in columnas_faltantes:
            print(f"   ✗ {col}")
        print("\n📋 Columnas encontradas en el CSV:")
        for col in df.columns:
            print(f"   • {col}")
        return
    
    print(f"\n✅ Todas las columnas requeridas están presentes ({len(columnas_requeridas)} columnas)")
    
    # Conectar a la base de datos
    print("\n" + "═" * 80)
    print("🔌 Conectando a PostgreSQL...")
    print("═" * 80)
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Preparar datos para inserción
    productos_a_insertar = []
    errores = []
    
    for idx, row in df.iterrows():
        try:
            # Validar campos obligatorios
            sku = str(row['SKU']).strip() if pd.notna(row['SKU']) else None
            marca = str(row['MARCA']).strip().upper() if pd.notna(row['MARCA']) else None
            familia = str(row['FAMILIA']).strip() if pd.notna(row['FAMILIA']) else None
            medida = str(row['MEDIDA']).strip() if pd.notna(row['MEDIDA']) else None
            
            if not all([sku, marca, familia, medida]):
                errores.append(f"Fila {idx+2}: Faltan campos obligatorios (SKU, MARCA, FAMILIA, MEDIDA)")
                continue
            
            # Campos opcionales
            diseno = str(row['DISEÑO']).strip() if pd.notna(row['DISEÑO']) and row['DISEÑO'] != '' else None
            indice = str(row['INDICE']).strip() if pd.notna(row['INDICE']) and row['INDICE'] != '' else None
            descripcion_larga = str(row['DESCRIPCION LARGA']).strip() if pd.notna(row['DESCRIPCION LARGA']) else None
            
            # Precios
            costo = limpiar_precio(row['COSTO'])
            cuota_3 = limpiar_precio(row['3 CUOTAS'])
            cuota_6 = limpiar_precio(row['6 CUOTAS'])
            cuota_12 = limpiar_precio(row['12 CUOTAS'])
            efectivo_bsas = limpiar_precio(row['EFECTIVO BSAS'])
            efectivo_int = limpiar_precio(row['EFECTIVO INT'])
            mayorista_fact = limpiar_precio(row['FACT MAYORISTA'])
            mayorista_sin_fact = limpiar_precio(row['SIN FACT MAYOR'])
            
            # Stock
            stock = limpiar_stock(row['STOCK'])
            
            producto = (
                sku, marca, familia, diseno, medida, indice, descripcion_larga,
                costo, cuota_3, cuota_6, cuota_12,
                efectivo_bsas, efectivo_int, mayorista_fact, mayorista_sin_fact,
                stock
            )
            
            productos_a_insertar.append(producto)
            
        except Exception as e:
            errores.append(f"Fila {idx+2}: {str(e)}")
    
    # Mostrar errores si los hay
    if errores:
        print("\n" + "═" * 80)
        print(f"⚠️  Se encontraron {len(errores)} errores durante el procesamiento")
        print("═" * 80)
        for i, error in enumerate(errores[:10], 1):
            print(f"   {i}. {error}")
        if len(errores) > 10:
            print(f"   ... y {len(errores) - 10} errores más")
    
    # Insertar productos
    if productos_a_insertar:
        print("\n" + "═" * 80)
        print(f"💾 Insertando productos en la base de datos...")
        print(f"   Total a procesar: {len(productos_a_insertar)} productos")
        print("═" * 80)
        
        insert_query = """
        INSERT INTO products (
            sku, marca, familia, diseno, medida, indice, descripcion_larga,
            costo, cuota_3, cuota_6, cuota_12,
            efectivo_bsas_sin_iva, efectivo_int_sin_iva,
            mayorista_fact, mayorista_sin_fact, stock
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s
        )
        ON CONFLICT (sku) DO UPDATE SET
            marca = EXCLUDED.marca,
            familia = EXCLUDED.familia,
            diseno = EXCLUDED.diseno,
            medida = EXCLUDED.medida,
            indice = EXCLUDED.indice,
            descripcion_larga = EXCLUDED.descripcion_larga,
            costo = EXCLUDED.costo,
            cuota_3 = EXCLUDED.cuota_3,
            cuota_6 = EXCLUDED.cuota_6,
            cuota_12 = EXCLUDED.cuota_12,
            efectivo_bsas_sin_iva = EXCLUDED.efectivo_bsas_sin_iva,
            efectivo_int_sin_iva = EXCLUDED.efectivo_int_sin_iva,
            mayorista_fact = EXCLUDED.mayorista_fact,
            mayorista_sin_fact = EXCLUDED.mayorista_sin_fact,
            stock = EXCLUDED.stock,
            updated_at = NOW()
        """
        
        try:
            execute_batch(cur, insert_query, productos_a_insertar, page_size=100)
            conn.commit()
            
            print("\n✅ ¡Importación exitosa!")
            
            # Mostrar estadísticas
            cur.execute("SELECT COUNT(*) FROM products")
            total = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM products WHERE tiene_stock = TRUE")
            con_stock = cur.fetchone()[0]
            
            print("\n" + "═" * 80)
            print("📊 ESTADÍSTICAS FINALES")
            print("═" * 80)
            print(f"   📦 Total productos en BD:     {total:>6}")
            print(f"   ✅ Productos con stock:       {con_stock:>6}")
            print(f"   ❌ Productos sin stock:       {total - con_stock:>6}")
            print(f"   📝 Productos procesados:      {len(productos_a_insertar):>6}")
            if errores:
                print(f"   ⚠️  Filas con errores:        {len(errores):>6}")
            print("═" * 80)
            
        except Exception as e:
            conn.rollback()
            print("\n" + "═" * 80)
            print("❌ ERROR al insertar en la base de datos")
            print("═" * 80)
            print(f"   {str(e)}")
            print("═" * 80)
            raise
    else:
        print("\n" + "═" * 80)
        print("❌ No hay productos válidos para insertar")
        print("═" * 80)
    
    # Cerrar conexión
    cur.close()
    conn.close()
    print("\n✅ Conexión cerrada correctamente\n")

if __name__ == "__main__":
    # Ruta del CSV
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = input("📂 Ingrese la ruta del archivo CSV: ").strip()
    
    # Verificar que el archivo existe
    if not os.path.exists(csv_path):
        print(f"❌ ERROR: No se encontró el archivo {csv_path}")
        sys.exit(1)
    
    # Importar
    importar_productos(csv_path)
