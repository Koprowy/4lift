package org.example.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@RestController
@RequestMapping("/api/motivation")
public class MotivationController {

    private final HttpClient http = HttpClient.newHttpClient();

    @GetMapping("/random")
    public ResponseEntity<String> random() throws Exception {
        // ZenQuotes: zwraca tablicę z 1 obiektem {q, a, ...}
        var req = HttpRequest.newBuilder()
                .uri(URI.create("https://zenquotes.io/api/random"))
                .GET()
                .build();

        var res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            return ResponseEntity.status(502).body("{\"error\":\"quote provider error\"}");
        }
        // zwracamy 1:1 JSON z zewnętrznego API (front sobie wyciągnie q/a)
        return ResponseEntity.ok(res.body());
    }

    @GetMapping("/today")
    public ResponseEntity<String> today() throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create("https://zenquotes.io/api/today"))
                .GET()
                .build();

        var res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            return ResponseEntity.status(502).body("{\"error\":\"quote provider error\"}");
        }
        return ResponseEntity.ok(res.body());
    }
}
