import pyodbc

server = '192.168.2.4'
database = 'kilndb'
username = 'sa'
password = 'lk,ki5123456'

conn_str = f"Driver={{ODBC Driver 17 for SQL Server}};Server={server};Database={database};Uid={username};Pwd={{{password}}};TrustServerCertificate=yes;"

with open('debug_dw_today.txt', 'w', encoding='utf-8') as f:
    try:
        conn = pyodbc.connect(conn_str, timeout=5)
        cursor = conn.cursor()
        
        f.write("Searching for all records on 2026-02-10:\n")
        cursor.execute("SELECT m_date, m_part, qtyp, qtycomp, m_cp FROM dbo.v_rpt_sort_1 WHERE m_date >= '2026-02-10' AND m_date < '2026-02-11'")
        rows = cursor.fetchall()
        f.write(f"Total rows today: {len(rows)}\n\n")
        for row in rows:
            f.write(f"Date: {row.m_date}, Part: {row.m_part}, Target: {row.qtyp}, Comp: {row.qtycomp}, CP: {row.m_cp}\n")

        f.write("\nSearching for WW (142%) records today:\n")
        cursor.execute("SELECT COUNT(*) FROM dbo.v_rpt_sort_1 WHERE m_date >= '2026-02-10' AND m_date < '2026-02-11' AND m_part LIKE '142%'")
        f.write(f"WW Count: {cursor.fetchone()[0]}\n")

        f.write("\nSearching for DW (143%) records today:\n")
        cursor.execute("SELECT COUNT(*) FROM dbo.v_rpt_sort_1 WHERE m_date >= '2026-02-10' AND m_date < '2026-02-11' AND m_part LIKE '143%'")
        f.write(f"DW Count: {cursor.fetchone()[0]}\n")

        conn.close()
    except Exception as e:
        f.write(f"Error: {str(e)}\n")

print("Done. Results in debug_dw_today.txt")
