import pyodbc

server = '192.168.2.4'
database = 'kilndb'
username = 'sa'
password = 'lk,ki5123456'

conn_str = f"Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd={{{password}}};TrustServerCertificate=yes;"
print(f"Connecting to {server} using working string pattern...")

try:
    conn = pyodbc.connect(conn_str, timeout=5)
    cursor = conn.cursor()
    print("Connected successfully!")
    cursor.execute("""
        SELECT TOP 1 
            m_date, m_kiln, m_job, pt_desc1, m_cp, 
            qtyp, qtya, qtyscrp, qtyrjct, 
            sub_typ, sub_qty, rsn_desc 
        FROM dbo.v_rpt_sort_1
    """)
    columns = [column[0] for column in cursor.description]
    print(f"COLUMNS: {columns}")
    row = cursor.fetchone()
    if row:
        print("DATA_START")
        for i, val in enumerate(row):
            print(f"{columns[i]} : {val}")
        print("DATA_END")
    conn.close()
except Exception as e:
    import traceback
    print("Error Details:")
    print(e)
    traceback.print_exc()
