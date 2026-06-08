import pyodbc

server = '192.168.2.4'
database = 'kilndb'
username = 'sa'
password = 'lk,ki5123456'

conn_str = f"Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd={{{password}}};TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str, timeout=5)
    cursor = conn.cursor()
    print("Distinct dates in v_rpt_sort_1 (Latest 20):")
    cursor.execute("SELECT DISTINCT TOP 20 m_date FROM dbo.v_rpt_sort_1 ORDER BY m_date DESC")
    for row in cursor.fetchall():
        print(row.m_date)
    
    print("\nChecking for data around 2026-01-21:")
    cursor.execute("SELECT COUNT(*) FROM dbo.v_rpt_sort_1 WHERE m_date >= '2026-01-14' AND m_date <= '2026-01-21'")
    count = cursor.fetchone()[0]
    print(f"Record count between 2026-01-14 and 2026-01-21: {count}")

    conn.close()
except Exception as e:
    print(e)
