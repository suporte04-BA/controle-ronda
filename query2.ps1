try {
    $key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"
    $headers = @{}
    $headers.Add("apikey", $key)
    $headers.Add("Authorization", "Bearer $key")
    $uri = "https://rdmbayprbfqbjhfqcasp.supabase.co/rest/v1/registros_ponto?select=id,foto_url&limit=5&order=created_at.desc"
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing -ErrorAction Stop
    $response.Content | Out-File "C:\Users\usuario\Downloads\controle-ronda-temp\query_result.txt" -Encoding utf8
} catch {
    "ERROR: $($_.Exception.Message)" | Out-File "C:\Users\usuario\Downloads\controle-ronda-temp\query_result.txt" -Encoding utf8
}
