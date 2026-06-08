import pyodbc

server = '192.168.2.4'
database = 'kilndb'
username = 'sa'
password = 'lk,ki5123456'

conn_str = f"Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd={{{password}}};TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str, timeout=5)
    cursor = conn.cursor()
    
    print("Searching for rsn_id containing 'JMMD72':")
    cursor.execute("SELECT DISTINCT rsn_id, rsn_desc FROM dbo.v_rpt_sort_1 WHERE rsn_id LIKE N'%JMMD72%'")
    rows = cursor.fetchall()
    if not rows:
        print("No rsn_id matches found for 'JMMD72'.")
    else:
        for row in rows:
            print(f"Match found -> rsn_id: {row.rsn_id}, rsn_desc: {row.rsn_desc}")

    print("\nChecking any rsn_id that starts with 'J':")
    cursor.execute("SELECT DISTINCT TOP 20 rsn_id, rsn_desc FROM dbo.v_rpt_sort_1 WHERE rsn_id LIKE N'J%'")
    for row in cursor.fetchall():
        print(f"rsn_id: {row.rsn_id}, rsn_desc: {row.rsn_desc}")

    conn.close()
except Exception as e:
    print(e)
