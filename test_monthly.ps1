$url = "https://rdmbayprbfqbjhfqcasp.supabase.co/functions/v1/send-monthly-report"
$headers = @{
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w"
}
$body = '{}'

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 10 | Out-File "C:\Users\usuario\Downloads\controle-ronda-temp\test_monthly_result.txt" -Encoding utf8
} catch {
    $result = @{
        StatusCode = $_.Exception.Response.StatusCode.value__
        Message = $_.Exception.Message
        Body = $null
    }
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $result.Body = $reader.ReadToEnd()
        $reader.Close()
    } catch {}
    $result | ConvertTo-Json -Depth 10 | Out-File "C:\Users\usuario\Downloads\controle-ronda-temp\test_monthly_result.txt" -Encoding utf8
}
