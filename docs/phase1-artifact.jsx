import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, AlertCircle, ClipboardList, Wrench, Camera, Package, BarChart3, Plus, ChevronLeft, X, ExternalLink, Trash2, Edit3, Check, BookOpen, Hammer, HardHat, MapPin, Phone, Mail, User, Hash, Building2, Calendar, AlertTriangle, CheckCircle2, Clock, Link as LinkIcon, Image as ImageIcon, Home, Mic, MicOff, Zap, ListChecks, Library, MessageSquare, Activity, Send, Search, ChevronRight } from 'lucide-react';

// ============ PMC LOGO (embedded as base64) ============
const PMC_LOGO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAEAAQADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD57HSlFIKWgBacKbSigBwpRTaWgB1KKQUUAOFOptKDQA4UopopaAHVJBFLPIIoY3lkIJCquTgDJ/IAmmwRyTzJDDG0ksjBURRksScACvffCPgWDw74E1iWVFm1m602dZZcZ8sGNv3ae3qe59sVz4jERopX3ZpCm5ngINOpiHKg+wpwNdBmOFFJS5oAdRTaUUAOpQabSg0AOpc02jNAD6KbS5oAXNLmkooAWikozQA6vt79k/8A5Ifo/wD12uv/AEe9fEGa+3/2Tv8Akh+j/wDXa6/9HvQB8C0opopaAHClpKUUAKDThTaWgB1LTRSigBwNLTaUGgBwpRTaltYZLm5it4RmSVwiD3JwKNgPTPgj4eWW7bxBdJkREx2oP97+J/w6D8a9405Ekj8uQZRxtYexGD+lcX4WsodO062sYBiOCMIPfHU/icmu10voK+ZxNZ1ajkerCnyQsfJHiHTZdG16/wBKmBD2lw8Jz6KeD+IwapCvXv2mPDTWWu2nie3j/wBH1BBDcEDhZkHBP+8mP++TXkFfQYeqqtNSPMnHlk0OFLTRSitiRwNFJQDQA4GlptLQAoNLTc0tADqXNNzRQA6lzTaM0AOzRmkzRQA6vuD9k7/kh+j/APXa6/8AR718O19w/sm/8kO0f/rtdf8Ao96APgSnCmg0tADhS02lFADqUU0UtADqUU0GlFADgaWkpRQAorpPhvbC48W2xYZECtL+IGB+pFc1XZfCUj/hIZ89fsxx/wB9LWGJly0pPyNaCvUR7bpX8NdbpXQVyWk9RXW6V2r5hnqyL/irw1a+LvCV7oN0QguI8xSkf6qUco/4Hr7E18a6vp95pOq3Wl6jA0F5aStDNGf4WU4P4dx7EV9z6V/DXk37Uvw6a/0z/hO9IgJubSMJqcaDmSEcLN9U6H/Zwf4a9DLsT7Ofs5bP8zgrxvqfM9KDTc0te8cgtKKbmloAdSg03NLQAtLTc0uaAFBpabS0ALmlzTc0tAC0tNooAdX3F+yZ/wAkO0f/AK7XX/o96+G8mvuT9kv/AJIbo/8A12uv/R70AfAdKKQUUAOFLSUooAdSg02loAWnA00UUAOFOptLmgBwNdH8ObtbXxbahyAs4aE59SOP1Arm6fDI8UqSxsVkRgysOxByDUVIc8XHuVCXLJM+nNJ/hrrdJ6CvP/AmrRa3o1vfxkbmG2VR/BIPvD+v0Ir0DSu1fKzi4txZ68mpK6Ot0ntXUWqJLbvHKiyRuhVlYZDAjBBHcGuX0ntXVaf/AKo/SszlkfFfx9+HT+BPFJlsI2OhX7M9m3XyW6tCT6r1Hqv0Neb5r7x+I3h3TvFXh270TVE3QTr8rgfNE4+66+4P58jvXxF4t0DUPDHiC60XU0Cz27YDD7siH7rr7Ec/p2r6HAYr20eWW6OWpDl1RmUU3NKDXoGQ4GikozQA7NLTc0UAOozSZozQA7NFJRmgBaXNNzS5oAXNfcn7Jf8AyQ3Rv+u11/6PevhrNfcv7JX/ACQzRv8Artdf+j3oA+A6WmilFACinU2lBoAcKUGm0tADqUU0UtAC04U0UUAPBpaaKBQB1nw38Vv4Z1kNPufT7ghbhByV9HA9R+o/Cvp3QZ4bm3iuLeVJYZFDo6HKsp6EGvjivR/g58RG8MXaaVq7s+jSvw/U2rH+IeqHuPxHfPm47B+0XPDf8zpoVuX3XsfWOk9q6rT/APV/hXJaHNFPDFPBIksUih0dGyrKeQQe4rrdP/1f4V4DN5mZqv8AFXjXx18FJ4q0T7VZxj+17FS1ue8q9WiP16j0P1Nezar/ABVyWq9TWlKpKnNSjugSUlZnxEQVYqwIIOCCMEGivTPjt4WXT9W/4SCyjxbXj4uVUcJN/e+jfzB9a8yr6ijVVWCmjinBwlZig0uabmlrUgdRmm5pcigB2aKSigBaXJpuaM0AOzRmkzRQA6vub9kn/khmjf8AXa6/9HvXwvX3P+yT/wAkL0b/AK7XX/o96APgKlFNFLQA4GlptKDQA4GlptKDQA6lBpopaAHUoNNBpaAFpQaQGigB1XbXTb650271KG3drSz2CeboqljhRnuST09OabomnXOrarbabajM1w4RSei+pPsBk19A+J/DFtafBfVNG0uLi2txcDj5pGRg7MfUkA/yrlxGJjScY9Wa06Tmm+xxnwK+KsvhC8j0bXJHl0CV/lflms2P8S+qeq9uo7g/Y+jTw3NnHcW8sc0MsYeOSNgyupGQQR1BFfnAD717b+zh8X28I3kfhnxHcM3h+4bEMzHP2Byev/XInqP4TyO9cmPwXOvaU9x06nRn1JqveuS1Xqa6vU2Vl3qwZWGQVOQQehB7iuT1XvXho7IHEeL9Pt9V0u6066XMVwhQ+qnsR7g4P4V8wanZz6dqNxYXIxNBIY3+o7/Q9fxr6q1bvXhfxo00Q6tb6rGuFuF8uXH99eh/Ff5V6uW1uWfI9mTiqd4cy6HA5pabQDXuHnjs0tNzRQA6lzTc0ZoAdkUtNooAdRTaXNAC190fsj/8kL0b/rtdf+j3r4WzX3R+yP8A8kK0b/rtdf8Ao96APgGlFIDRQA4UtNFKKAHA0tNpQaAHClFNpRQA6lzTaUUAOpQaaKWgD0v4H6cpvLvVZFBK4giPpnlj/IV9B6CiTRGKVA8bqVdT0ZSMEfiK8V+DIUeG0I6m4kLfXIr2zw5/DXzeOm5VpXPUpxSpI+VfiR4Yn8IeMb7RJVbyUbzLVyP9ZA3KH8uD7g1zgNfXvx3+HbeNvBgv9Lg365pSNJbqo+a4i6vF9eNy+4x3r5C+tezg8Qq1O/Vbnn1I8sj6D/Zv+JzlIfAuvXBZcbdKuHPT/pgT/wCg/wDfPpXsOq96+HY3eORZI3ZHUhlZTgqRyCD2NfVHwr8a/wDCZeEVlu3B1WzxDej++cfLJ9GA/MGvPzHCqL9rHbqdGHqX91l3Vud1eZ/FW1Fz4XumxloGWZfwOD+hNemar3rhfGSCTRb9D0a3k/8AQTXBRlyzi/M7nHmi0eC0uaaDkClr6o8UdRTaXNADs0ZFNzS0ALS02jJoAdmjNJn2ozQAua+6v2Rv+SFaN/12uv8A0e9fCma+6/2Rv+SE6N/12uv/AEe9AHwBSimg0tAC0oNJmigBwNLTQaWgBwNLTaUGgB2aWm0UAOBpaaKUGgD1H4Hakhe60l2AcN58Q9RwG/Lg/jX0F4c/hr430fULrStSg1GyfZPA4ZSeh9QfUEcGvqz4V+JLDxPpEd9ZsFdSEuICfmhf0Pt6HuK8LMsO4z9otmd+Hq80OV9D2Tw990HpxXy5+1L8OF0XWpfGGi2+3Tr2X/TokHFvOx++B2Vz+TfUV9R+HvuD6VkeM7S21CxubG9gSe2uI2jljcZDqeorhw2IlQqcyJlDn0PgCuu+EniRvDfjS1nkkK2d0RbXQzxsY8N/wFsH86q/EjwrP4Q8TTaaxaS1fMlpM3/LSPPf/aHQ/n3rmsZGM4zX03u1qfkzk1hLzR9cavxu9q4PxvKINA1GUnAW3f8AUY/rXQeGNSbV/Bek6g7ZkmtE8w+rL8rfqDXB/GPUFttCFmG/eXcgXH+wvJP8h+NfO0qbdZQ8z1nO1Ny8jyIdMelLTaM19OeOOzS5puaKAHUUlGaAFpc0maM0ALmjIpKKAHV91/sif8kJ0b/rtdf+lD18JV92/sif8kJ0b/rtdf8ApQ9AH5/0oNNpaAHUoNNFLQAtKDSA0UAOpQaaKWgBwpabmigB1KDTQaWgB1bngnxTqnhLXYtW0uQB1+WWF/8AVzpnlGH8j1B5FYINLSlFSVnsNNp3R99fB/xho/jTw+mqaTLgr8lzbuR5lvJj7rD+R6EfjjR8R/xV8N/DXxtrPgLxRDrmjybsfJc2zk+XcxZ5Rv5g9Qea+ydI8U6T4y8MW+v6NKXtrgfMjffhcfejcdmB/Pgjg183jMG6EuZfCzrpVOZ6nlvxn8PJ4h8PTRogN5bEzWrd9wHK/Rhx9cV8y8g9Dn0NfX3iP+LBr5h+Imnrpni28jjXEUx8+MDsG5I/PNduV1nrTfqPE09FNHsfwskEfwv06SZwiKJmLMcBVEjHJ9uteOePNdOv+IZbqMn7LH+6twf7gP3vqTz+VaniXxeD4Q03wlpDFbS3tkW8mHHnyfeZR/sBifrj068XmurDYblqSqy3b0MqtW8VBDqM0maK7jnHUU2loAXNLmm5pc0ALmikooAdR+NNoyaAHZr7u/ZE/wCSEaL/ANdrr/0oevhDNfd37If/ACQjRf8Artdf+lD0Afn8DS02jNAD6UU2lBoAdQDTaWgB1KDTQaWgB1GabS5oAdSim0oNADqKbS5oAdmu++CvjqXwb4k8q5lb+xtQZY7xOoQ9FlA9V7+qk+grgKKipTjUi4y2Y4ycXdH2F4iIIJBBB5BByDXz98aIwNYsZf4mhdT+Df8A169H+F+tya18O7T7Q5e4sSbSRj1IXGwn/gJA/CvL/jHdLN4lhtlIJt4Pm9ixz/ICvEwdOVPE8va56NWSdC5xVLmm5pc17x5o6im0UAOzS5puaM0AOopKKAFpabmlzQAuTRmkyKKAFzX3h+yF/wAkH0X/AK7XX/pQ9fB1feP7IP8AyQfRf+u11/6UPQB+fgNLTaUGgBQaWkoBoAdmlptLmgBwNLTaUGgB2aKSjNADs0tNooAdmlHNNBpaAHUZpuaWgD1j4SarbaF4A13VL99tut2gjXvI/l/dX3PFeZ6rfT6lqVxf3JzNPIXbHQZ7D2A4/CoXurhrOOzaZzbxOzpHn5QzYy2PU4Az6Cos1hToKNSVTqzSVRyio9h2aBSUVuZjqM02lzQA7NFNpaAFpc03NGaAHZozSZooAXNLTaKAHV94/sgf8kG0X/rtdf8ApQ9fBlfef7H/APyQXRf+u11/6UPQB+fdLTQaWgBadTQafAYxMpmR3jz8yq20kexwcflQAlKK7Q+HNCHhL+3QNQLfZxN5JmTH39uN23+lZ3h2x8NaxqCabI+o6dPOdkEplSWMv2DDapGfrWCxEWm1fTc1dGSaT6nO0orT8QaLc+Hdb/s/U0MiqQ4aJtoljPdSQcdxyODXa6b4O8MXngWTxLjVkdLaaf7P9pQg+W20jds75HanOvCMVLoxKlJtrseb0ua7Hwdo/hLxPqK6MJtV0jUJ8i1kklSeF2xnaQFUgmsHxToV/wCG9cn0jUkVZ4sEMpysinlWU+hH+FVGrFy5epLg0r9DNpQafZNbJdRteRSzW4P7xIpBGzD2Yg4/I169cfD/AMFxfC0eNVGvM5sY7v7IbuMDDS+Xt3+X65PSlVrRp25uoRi5bHj1Fdj4W/4VxfazBZ63aeItMtZnCG6j1CKUREnALKYgdvqR064rK+IGkWvh/wAc61odlJLJbWF48ETysCzKOhJAAJ+lNVE5cttRNaXMTNLXoc3gTS/Dnw60vxj4wm1CSTWnI0zTLFkjYxgbvNlldW2jGCFCk8j8Hab4M8Ka18PvE/i7SNb1CKbRbVHfSLpEMqyPIqq/mrgPEQW/hVgRg+8+3hv02Hys86zS5rs/gx4e0DxX45g8PeIGv4YLqKRkuLWdI/JMaM5ZtytlcKemMdea9C+G3w3+Gfju51Y6Zc+KIbKyvobOCeS5hLXHmBsPt8v5B8vAyTg0quIhSb5ugRi3seFUua9OtvDvw5vPAviLXLb/AISJNS0RwkljJexEOHk8tJAwi5XPUYyMY7g15vp8llFch9Rt57iAKdyQTCJiccfMVbH5VcKqney2BxsQ5pa9f8Y+APBegeBovE0Y165Mi2rC3a7iTHnruHzeWegB7V5NbW019fpaWFvLLLPJsghX5nYk8L7n/PFKlWjVTcegSg4uzIaK7HxD4X0nwkkVt4ivri81eRBI1jYMqrAp6eZKwOSfRR+lVdG0bQ/EVwLLSr+403UX/wBVBflXimP91ZEAIb2K80e2jbm6dx8jvbqczmjNaPiTRbzQNUbTdQ8r7QqK7CN9wAYZHNbPgbRtE15riC7S/hlt4BK0kUylX+YLgKV46juacqsYw5+gRg3Ll6nK5FLW3r1touma1eacLS/lFtMY9/2pRux3xs4pNasdHTQ7TUtKluiZZmiljnZSUIXOOAPzpKqnbTcbpvXyMWim0ZNamY6vvP8AY/8A+SC6L/12uv8A0oevgvNfen7H3/JBdF/673X/AKUPQB+fVKDTaUUALSg00U4daAPST/ySk/8AYOH/AKPriPDUck3iLTYolLO13FtA6/fBru4JEj+FweSFJlXTxmNiQG/feoINcjpPiZ9IkafS9J062uSConKvK6A9du9iB+Vefh3K01FdWdda3uNvojqfjnNE2q6dbb1e4jjldyOqo75QH8Aa3vDh/wCLJT/9g2+/9GivIL26ub27ku7ud555W3PI5yWNexeFHSP4MySSQrMi6felo2JAYeaOCQQfyqK9L2VCEezCnPnqSl5Hnnw0ikm+IWgpEjMwv4mIHopyT+ABNdZ+0VcQv4r0+1Eiy3VtZYuGHYtIzIp9wpH51vfBa48P3Ol3s+nafb6XrMQMVxcIzSvFE/CSp5hPyhsbh7eleTeK7PVdP8SX9nrbySajHM3nyOcmQnnfnuCMEexrWL9ribvTlRnJctL1M4HkV9CXgJ/ZjUDJ/wCJDB0/6/DXz0OtfRYvLuw/Ztiu7G5mtriLQYCksTlXXN2RwR04NGN+x6oVLr6Hinhvw5catpmvai9vciz0rTpLl5lXCiTcqohJHOcngc8VlapfXWp6hcX99MZ7m4bdLIQAWOMZ447V12ifEHXW8O+ItA1rW7u8sdS02RIo7l2kKzhkKbSeRnBB7Vx+p2V1p3km7hMfn2yXcQyDuicEq3HTIHSumDlzPm+Rm7W0PqLwn/wjPxn+DGm+Gr2drfVtEgSN2hXdPaui7FnEfWSF1ADAcg+4FeM+LvCXjL4YxalBeW8NxpOt2hsf7RtyZLadDIjjaw+64MY+VuevWuXv4tY8FeLWjtNQltdRsWR47q1do2G5FcFT1xhh9a+jfgh8UF+IpufCHijTrS41W4tmaQbALfV4lGXSSPokwX5g64zjtjFcUozw6c46wetuxd1LR7nzToGr3Wi6g19ZhDK1vPb/ADg4CyxNGxGO+HOPeve/2PuNJ1gDtrWn/wDoMleN/Fnw3D4P+JGueHLWV5LayuisDOct5bKHUE9yAwB+leyfsff8grWf+w1p/wD6DJV4xqWHcl1sKn8djwyTVLmwuNftIQhj1Evbzbs5CicSAj3yg/Amsdj8rfQ1Z1XnVb3/AK+Zf/QzVVvun6Gu2CViGfQfxa/5Ihaf9ctJ/wDRTVz/AOzRpFtLqepa9cqGa0CW1vkfdZwSzD32rj8TXQfFv/kiFp/1y0n/ANFNWN+zJqFu0usaJM4WWQx3cQ/vBQyP+QYGvJTaws7d/wDI6tPaxueVeI9SuNb8R32pS7nlu7l3A6nBOFUfhgUqaNr0TrJHpGqRuhDKwtJAVIPB6djSTQtovilre8R1Njf7ZVA5wknOPwFbOn69qWsfEmz1GfULpzPqiMuZWGEMnC4zgDHGK9K7jFcq0sc6s3ruJ8Rpr3U9Xi1i4s7mLzbO3WZnhZFEoTDLkjrkHirvwk/5COq/9eQ/9GrWr8eJ55LnSEeaRl23J2ljjIlwOPYDFZPwjP8AxMdV/wCvIf8Ao1a5XLmwl7W/4c3StXMfxtHLJ421ZIo3kdrtwqqpJJ9BVTXIZdOvJ9J3N5cUisytj7+wZ/mRWv4w1zWLPxlqgtdSuoxFdv5aCQ7R7Y6Y9qytfnbVNVvtThAaL5HkYcAFgo6H/ayK3pOXLG+1v8iKiV5W3uZmaM0maM10mA7Nfev7Hv8AyQTRf+u93/6UPXwRX3t+x7/yQTRf+u93/wClD0AfnyDRSUuaAFBqSBFeZEaVIlJ5d84X3OATUVKOKAPQv7V0I+Bzon9swi6+yCHd5Mmzd5m/rtzjt0rg50WOZ0SVJlU4Dpna3uMgH9KiozWNKiqd7Pc0qVOe2mxLAqySpG8iRKzAF3zhR6nAJx9K9W0bXPDFr8OJPDs3iK2+2PaXEIZbeUxhpH3DnbnAx6V5KKXNFaiqqSb2FCfIb/hvWZvCfimHUbK4hvUhO2Xy93l3EbD50+YA4I45HUCu7+J974G8V2djdab4kht9Stx5RNzbTAPB1VGKqfmToD3Ga8mzRSnQUpqd7NDVRqLj0LNpBHNepBJdwW8bNgzyhtij1O0FsfQd69uufE3gyT4Mjweniyz/ALS/s2K0LtbTiHcs/mE52ZxjI6V4TmlorUFVtd7aijPludh4f8OeE5dTiGu+PtMtrANmU2lrcySsO4XMYAJ9T09DVn456r4e1jxqZvCcyzaTDpttaW+2NkC+XHt24YA8cc964ajNUqb51JsXNpY9Y+J+ufDzxrfWktpd32japaWUFpJfS2xltL0RxKuWCfvI2U5UNtbIAyOhq18Jdd8C/DC/uPFd1rH/AAk+vLbvDp9jp9vLHBEXGGeSWVV6jjCg4BPU9PHqXNR9XXJyXdg5tbmp4q13UPEniPUNf1R1kvb+dp5iowAT0UDsAAAPYCva/wBn7xR4I8DaVfLrvjGyM11e212kdta3D7BGrZViYwM5bHGeleAZpc06tBVIez2QRlZ3NfxTa2Vtqsz2Os2eqwzSySCS3SRdoLkgMJFU5we2frVLT7aK7uRBNfW1ijKT51wHKA46HYrHn6VVpc1qlZWuK+p7n488S+DNb+HMHhyx8WWgvI0slLy2s6xkwIVbBCE85yOO1eO6Pqd7oWtQ6lpd0EubWQmOVR8rdjweqkdj2NZ2aWsqVCNOLjumVKbk7ndeLtW8N+M511h5joOtMoW6jkiaS2uCBgOrICynHHI/HvWbo8+geHbpNSNx/bmoQnfbQxRvHbRuOjuzAM2OoUAfWuXoyaaopR5U3YOfW/U6rx14n/4Se20q4lhigu4EmSeOIELy4IYZ9ee5q38Or3SNIkurnUtXgi+02wjEaxSM6HeG5+XHbsT1ri80ZFJ0Iun7NaIaqvm5nudH4lTT9S8Q39/BrVksVxO0iBll3AH1+SpbptAsvCVxZWeoi8v7iWNpGETKMKc4GR0HP1rl6KfsdEr6IftNW7bjuKKbRWxkOr73/Y8/5IHon/Xe7/8ASh6+Bq++f2O/+SB6J/13u/8A0oegD89waWm5ooAcKUU3NLQBIscjRtIqMUTG5gOFz0z6VYsrC+vGVbW0mmLBiu1eCFxuIPtkZ+tSaXqs+nW9zHb8POUyxwRhScqVPBBz0rTs/FEqNCbyA3HlxzRAKVUBZNmAqlSoC7emCOaAM+fRNXg8vzdOuFMriOMBclm9ABnJqSbw/rsPledpV0nmyCOPKfec9FHuatvr9kuoR39vp0qzBGikDTIqtGylWA8tF2t833qjsdT0bT9SstQsNLvVmtrhJcS3iurAdV4QfnQBkwQyziUwRtIIYzJJt52ICAWPtkj86lNneLp66g1tKLNpTCs5U7DIBkrn1wc1rJ4qv3sr+0uoraSK7tmgzFbRRMhLKd2VQE/d6e9Xn8atJZto8mkWX9hmLyVtVUCVFGSrCXGd4clt2OSSMYNAHNyWl1HJBHLbTRvcKrQhkI8xW+6Vz1B9RVpNC1p72Gyj0q8e5meRIoliLO7RsVcAD+6QQfTFbEfji/T7Bbva297p1pbwRfYbweZGWiAHmIRho2JGcqR75qdvG4lnb7RpXmW88d7DdRpcmNnS4n847HAypUgDOCCM5GDigDE1rw9ruiwxS6vpV1YxysVjaZQAxAyQOfSobjSNUt7mztZ9PuYp76OOW1jeMhpkkOEZc9Qx6VopqHhO31CzurXw7fyJDIXmt7vUVkjnwPlU7Y1IXdgn1HHGc1s6h8R7/WWtJtf0yxurqxvor2zntYhbtGwkVpEYAEMjhRxxtIBHcEA4ueKWCeSCZGjlico6MOVYHBB9wQRVnR9L1PWb9LDSdPur+7cErDbxF3IHU4HYdz0Fbut6v4L1CS/uofDetwXl08sqO2sI8aSOS2SvkglQT0yPrVPwhr8OinUra8sGvtP1S0FrdxR3Jt5dgdZAUkAO0hkGQQQRkEUASXfgrxdaX1pY3PhvUo7q8LC2hMWWlKjLbQCeg5PpTdR8GeLNO8j7b4c1KH7RKIYcw58yQgkIMZ+YgHA6nFXtP8QeF9J1ZLvSPDuqJBLa3NpexXOqI7SxTRlDsZYl2MMk5IYH0q3o3jLQ/D72w0Dw9fQoupW19cG61IStJ5AfYi7Y1C5MhJPPQUAcjb2V5O1ysNtK7WqGS4AXmJQQpLA9MFgPxrbn8DeL4Ld7ibw9epCgJZzswABk87uwqdvHep3WkahZatbWmpXN3Zm0XUZUxdxoWVsGQf60fIPv5I7GsSbUkk8M22i/ZlHkXst35ueu+NE24x22Zz70AXoPCHiie3iuIdCvXimjWSJgo+dWGVIGcnI6Vl2tje3RuBbWs0xtommn2IT5aKcMzegGa6+x+IcsMsaz6TbyQRWtvBCyJCtxC0KBd6ytGx5xnBBxxgjFZ2j+MrzRLTytItLZJpZmnuri6jE7zvk7euMKATx3LMT2wAZGmaPq+po8mnaddXSRnDvHHlVPoT0z7VPB4d12eeaCLSrl5YWCSIAMqSMgYz6c1buNc0e7thZXOhzpZxTSTW0dte7PK8zBdeVIZcjg4yBxk4rPsb+0sPEMGpWdnIIIJA6Qyyhm6dCwUd/agBtzpGqW8pimsJ0kAUlcAnDNtXp6nge9Vlt52lkiEMnmRKzSIVwUC9SR2xVvQtTXTBKPI83zHgfhtuPLkD+nfGKtP4kupluhdwxXRmjliSWQfvYlfIwHHLAZ6Nn2xQBTi0jVJYFnjsLhomGVfZgEeoz2qlW5Frtp9qN5caa0tw6Kkn71TG2AAMKyEr0HQ1gjPrQA7JozSZozQAua++f2Ov8AkgWif9d7v/0oevgXPtX31+xz/wAkC0T/AK73f/pQ9AH57UZr9BP+GZPg7/0Ll1/4M7j/AOLo/wCGZPg7/wBC5df+DO4/+LoA/PylBr9A/wDhmX4O/wDQuXX/AIM7j/4uj/hmX4O/9C5df+DO4/8Ai6APz9or9Av+GZfg7/0Ll1/4M7j/AOLo/wCGZvg9/wBC5df+DO4/+LoA/P4Giv0B/wCGZvg9/wBC5df+DO4/+Lpf+GZvg9/0Ll1/4M7j/wCLoA/P7NLX6Af8MzfB7/oXLr/wZ3H/AMXR/wAMzfB7/oXLr/wZ3H/xdAH5/wBLmvv/AP4Zn+D/AP0Lt1/4M7j/AOLo/wCGZ/g//wBC7df+DO4/+LoA+AKXNff/APwzP8H/APoXbr/wZ3H/AMXR/wAM0fB//oXbr/wZ3H/xdAHwDmivv7/hmj4P/wDQu3X/AIM7j/4uj/hmj4P/APQuXP8A4M7j/wCLoA+As0Zr79/4Zo+D/wD0Llz/AODO4/8Ai6P+GaPg/wD9C5c/+DO4/wDi6APgOivvz/hmj4P/APQuXP8A4M7j/wCLo/4Zp+EH/Qu3X/gzuP8A4ugD4DozX35/wzT8H/8AoXbn/wAGdx/8XR/wzT8H/wDoXbn/AMGdx/8AF0AfAmaK++/+Gafg/wD9C7c/+DO4/wDi6P8Ahmn4P/8AQu3P/gzuP/i6APgSivvv/hmn4Qf9C7df+DO4/wDi6X/hmr4Qf9C7df8AgzuP/i6APgTJozX33/wzV8IP+hduv/Bncf8AxdH/AAzV8IP+hduv/Bncf/F0AfAmaM199/8ADNXwg/6F26/8Gdx/8XR/wzV8IP8AoXbr/wAGdx/8XQB8C5FffX7HH/JAdE/673f/AKUPR/wzV8IP+hduv/Bncf8AxdejeB/Cui+DPDkHh/w/bPbafbs7RxtK0hBdizfMxJPJNAH/2Q==';

// ============ STORAGE HELPERS ============
// Robust storage with detailed logging and status reporting.
// window.storage.get throws on missing keys (documented behavior) — we handle that.
const storage = {
  available() {
    return typeof window !== 'undefined' && typeof window.storage !== 'undefined';
  },
  async get(key) {
    if (!this.available()) {
      console.warn('[PMC] window.storage not available');
      return null;
    }
    try {
      const result = await window.storage.get(key);
      if (!result || !result.value) return null;
      return JSON.parse(result.value);
    } catch (err) {
      const msg = String(err);
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('null')) {
        return null;
      }
      console.warn(`[PMC] storage.get(${key}) error:`, err);
      return null;
    }
  },
  async set(key, value) {
    if (!this.available()) {
      console.error('[PMC] Cannot save — window.storage not available');
      return false;
    }
    try {
      const json = JSON.stringify(value);
      const result = await window.storage.set(key, json);
      console.log(`[PMC] Saved ${key} (${json.length} bytes)`);
      return !!result;
    } catch (err) {
      console.error(`[PMC] storage.set(${key}) failed:`, err);
      return false;
    }
  },
  async list(prefix) {
    if (!this.available()) return [];
    try {
      const result = await window.storage.list(prefix);
      return result?.keys || [];
    } catch (err) {
      console.warn(`[PMC] storage.list(${prefix}) error:`, err);
      return [];
    }
  },
  async delete(key) {
    if (!this.available()) return false;
    try {
      await window.storage.delete(key);
      return true;
    } catch (err) {
      console.warn(`[PMC] storage.delete(${key}) error:`, err);
      return false;
    }
  }
};

// ============ CODE REFERENCE DATA (BC Plumbing Code & SMACNA) ============
const CODE_REFERENCES = {
  demolition: {
    title: 'Demolition',
    code: 'WorkSafeBC OHS Regulation Part 20 + BCBC',
    sections: [
      { ref: 'OHS 20.112', text: 'Cap/disconnect plumbing, gas, and electrical services before demo. Lock-out where required.' },
      { ref: 'OHS 20.4', text: 'Hazardous materials survey (asbestos, lead, mould) required before demo of any pre-1990 building.' },
      { ref: 'BCBC 8.1', text: 'Demolition permit may be required by AHJ. Confirm with municipality before starting.' },
      { ref: 'OHS 6.1', text: 'Asbestos sampling and abatement by qualified abatement contractor only.' },
      { ref: 'TSBC SDC', text: 'Gas appliance removal: licensed gas fitter must disconnect and cap. Notify Technical Safety BC for permitted gas work.' }
    ]
  },
  'underground-sanitary': {
    title: 'Underground Sanitary',
    code: 'BCBC 2024 Book II Part 2',
    sections: [
      { ref: '2.4.4', text: 'Below-ground DWV materials: ABS (CSA B181.1), PVC (CSA B181.2), cast iron (CSA B70), copper DWV (ASTM B306).' },
      { ref: '2.4.6.4', text: 'Slope: 3" and larger min 1% (1:100); under 3" min 2% (1:50). Max ~4% to prevent solids separation.' },
      { ref: '2.5.4', text: 'Cleanouts: base of every stack, every change of direction >45°, max 15m intervals horizontal.' },
      { ref: '2.6.2', text: 'Trench bedding: granular, compacted, free of rocks >25mm. Pipe fully supported.' },
      { ref: '2.4.10', text: 'Building sewer: min 100mm diameter. Separate from storm unless combined system permitted.' },
      { ref: '2.4.8', text: 'Backwater valves required where fixtures below street main elevation, accessible for service.' }
    ]
  },
  'above-ground-sanitary': {
    title: 'Above-Ground Sanitary / DWV',
    code: 'BCBC 2024 Book II Part 2',
    sections: [
      { ref: '2.5.3', text: 'Fixture units (FU): WC=4, Lav=1, Sink=2, Shower=2, Tub=2, Floor drain=2. Total determines pipe size per Table 2.5.3.A.' },
      { ref: '2.6.2', text: 'Vent sizing: min 32mm (1¼"); combined vents per Table 2.6.2.A based on developed length and FU.' },
      { ref: '2.6.5', text: 'Vent pipes: min 32mm, increase to 50mm where exposed to freezing on roof.' },
      { ref: '2.6.7', text: 'Wet venting: max 4 fixtures, all on same floor, vent must be one size larger than drain.' },
      { ref: '2.5.7', text: 'Traps required on every fixture except WC. Trap seal 50–100mm. Max 600mm trap arm to vent for 1¼".' },
      { ref: '2.6.6', text: 'Vent termination: min 150mm above roof, 1m from any opening; 300mm in snow areas.' },
      { ref: '2.3.2', text: 'Pipe support — horizontal ABS/PVC max 1.2m; cast iron 1.5m; vertical 3m or every floor.' }
    ]
  },
  'domestic-water': {
    title: 'Domestic Water',
    code: 'BCBC 2024 Book II Part 4 + CSA B137',
    sections: [
      { ref: '4.6.1', text: 'Pipe sizing: based on fixture units + simultaneous demand. Min ¾" to building, ½" to most fixtures.' },
      { ref: '4.5.4', text: 'Hot water delivery max 49°C (120°F) at lavatories, showers, tubs. Anti-scald valves required.' },
      { ref: '4.7.2', text: 'Backflow prevention at every cross-connection. DCVA, RPBA, or AVB based on hazard level.' },
      { ref: '4.2.1.1', text: 'Pressure test: 1.5x working pressure or 860 kPa min, hold 1 hour, no detectable loss.' },
      { ref: '4.4.3', text: 'Insulation: hot water lines insulated per ASHRAE 90.1. Cold lines in unconditioned space insulated.' },
      { ref: '4.3.2', text: 'Pipe support: copper ½"–1" max 1.8m horizontal, 3m vertical; PEX max 0.8m horizontal.' },
      { ref: 'CSA B125.3', text: 'Trim and components: low-lead compliance (≤0.25% lead) required for potable water systems.' }
    ]
  },
  'hydronic-water': {
    title: 'Hydronic Heating / Cooling',
    code: 'CSA B214 + ASHRAE 90.1',
    sections: [
      { ref: 'B214 5', text: 'Hydronic system materials: copper Type L/K, PEX-AL-PEX, or steel. Glycol systems use compatible materials only.' },
      { ref: 'B214 6.3', text: 'Air separators and expansion tanks required. Pre-charge tank to system fill pressure (typically 12 psi residential).' },
      { ref: 'B214 7', text: 'Pressure test at 1.5x working pressure, hold 4 hours min, document for AHJ.' },
      { ref: 'ASHRAE 90.1 6.4.4', text: 'Pipe insulation: hot pipes >40°C insulated per table 6.8.3; cold loops insulated to prevent condensation.' },
      { ref: 'B214 8', text: 'Glycol systems: propylene glycol for potable-adjacent systems; ethylene only where no risk of cross-contamination.' },
      { ref: 'B214 9', text: 'Balancing valves on every branch circuit. Air vents at all high points. Drains at all low points.' }
    ]
  },
  insulation: {
    title: 'Insulation',
    code: 'ASHRAE 90.1 + BCBC 9.36',
    sections: [
      { ref: 'ASHRAE 90.1 6.4.4', text: 'Pipe insulation thickness varies by pipe size, fluid temp, and conductivity. See Table 6.8.3.' },
      { ref: 'BCBC 9.36.4', text: 'BC Energy Step Code: building envelope and mechanical system insulation requirements per step level.' },
      { ref: 'ASHRAE 90.1 5.4.3', text: 'Duct insulation: supply and return ducts in unconditioned space min R-6 (cooling) or R-8 (heating climates).' },
      { ref: 'CAN/ULC-S102', text: 'Insulation materials must meet flame spread ≤25 / smoke developed ≤50 for plenum applications.' },
      { ref: 'NIA Std', text: 'Vapor barrier required on cold piping (chilled water, refrigerant suction) to prevent condensation damage.' }
    ]
  },
  'natural-gas': {
    title: 'Natural Gas',
    code: 'CSA B149.1 (Natural Gas and Propane Installation Code)',
    sections: [
      { ref: 'B149.1 6', text: 'Pipe sizing: based on BTU load, length, and pressure drop. See sizing tables for 7" w.c. and 2 psi systems.' },
      { ref: 'B149.1 6.18', text: 'Materials: black iron, CSST (with bonding), copper (where permitted), or PE for underground.' },
      { ref: 'B149.1 6.20', text: 'Pressure test: 1.5x working pressure or 14 kPa min, hold per test pressure schedule, document for TSBC.' },
      { ref: 'B149.1 7', text: 'Venting per Annex B (Cat I) or manufacturer spec (Cat II/III/IV condensing).' },
      { ref: 'B149.1 8', text: 'Combustion air: dedicated supply per Annex F. Min 1 sq inch per 1000 BTU input for high-low openings.' },
      { ref: 'TSBC GAS', text: 'Gas work in BC requires licensed gas fitter (G-A or G-B). Permits via Technical Safety BC.' },
      { ref: 'B149.1 6.16', text: 'CSST: bonded per manufacturer (typically #6 AWG copper to electrical grounding system).' }
    ]
  },
  equipment: {
    title: 'Equipment Setting',
    code: 'Manufacturer + BCBC + TSBC',
    sections: [
      { ref: 'Mfr install', text: 'Always follow manufacturer install instructions exactly — they override generic code where stricter.' },
      { ref: 'BCBC 6.2.2', text: 'Clearances to combustibles per appliance label. Service access min 24" front, 6" sides typical.' },
      { ref: 'BCBC 6.2.3', text: 'Equipment seismic restraint required per BCBC 4.1.8 in BC. Tank straps, isolators with snubbers.' },
      { ref: 'CSA B51', text: 'Boilers and pressure vessels: registration with TSBC required above thresholds (typically 30 kW boiler).' },
      { ref: 'B149.1 8', text: 'Gas equipment: licensed gas fitter, TSBC permit, combustion analysis at startup.' },
      { ref: 'BCBC 6.2.6', text: 'Condensate management: trap, neutralizer for condensing appliances, drain to approved disposal point.' }
    ]
  },
  hvac: {
    title: 'HVAC / Ductwork',
    code: 'SMACNA HVAC Duct Construction Standards 4th Ed. + ASHRAE 62.1',
    sections: [
      { ref: 'SMACNA 1-3', text: 'Duct gauge: 26 ga min for rectangular up to 30" at 1" w.g.; increases by pressure class and size.' },
      { ref: 'SMACNA 4-2', text: 'Hanger spacing: rectangular max 8ft (2.4m); round max 12ft (3.6m); flat oval max 8ft.' },
      { ref: 'SMACNA 2-1', text: 'Seal classes: A (all joints), B (transverse+longitudinal), C (transverse only). Class A for >2" w.g.' },
      { ref: 'ASHRAE 62.1', text: 'Min ventilation rates: office 5 cfm/person + 0.06 cfm/sf; classroom 10 cfm/person + 0.12 cfm/sf.' },
      { ref: 'SMACNA 5', text: 'Flex duct: max 6ft length, fully extended, supported every 4ft, no sharp bends (min radius = duct dia).' },
      { ref: 'BCBC 6.2.3', text: 'Fire dampers at rated wall/floor penetrations, return air openings in shafts. Per CAN/ULC-S112.' },
      { ref: 'SMACNA 7', text: 'Test, adjust, balance (TAB) required for commissioning. Document airflows at all terminals.' }
    ]
  },
  controls: {
    title: 'Controls / BAS',
    code: 'ASHRAE 90.1 + manufacturer',
    sections: [
      { ref: 'ASHRAE 90.1 6.4.3', text: 'Controls requirements: thermostatic, zone, optimum start/stop, setback for off hours.' },
      { ref: 'ASHRAE Guideline 36', text: 'High-performance sequences of operation for VAV, AHU, terminal units, plant control.' },
      { ref: 'BCBC 9.36', text: 'BC Energy Step Code: controls support energy targets per step level (DCV, economizer, etc.).' },
      { ref: 'Mfr commissioning', text: 'Point-to-point checkout, sequence of operation verification, trend logs for 30 days post-startup.' },
      { ref: 'BACnet/MS-TP', text: 'Open-protocol controls preferred (BACnet) to avoid vendor lock-in for future service.' }
    ]
  },
  ac: {
    title: 'Air Conditioning / Refrigeration',
    code: 'CSA B52 Mechanical Refrigeration Code',
    sections: [
      { ref: 'B52 4', text: 'Refrigerant classification: A1 (R-410A, R-32, R-454B) safest for occupied space; higher classes need ventilation/detection.' },
      { ref: 'B52 5.3', text: 'Maximum refrigerant charge per occupied space volume — see Table 5.3.1.A for each refrigerant.' },
      { ref: 'B52 6', text: 'Piping: ACR copper Type L, brazed joints (silver brazing alloy >700°C), nitrogen purge during brazing.' },
      { ref: 'B52 7', text: 'Pressure test: 1.1x design high-side pressure with dry nitrogen, hold 1 hour, no loss.' },
      { ref: 'B52 8', text: 'Triple evacuation to <500 microns before charging. Document micron readings.' },
      { ref: 'TSBC EOR', text: 'Refrigerant handling: ODP/ECP card required (Environment Canada). Refrigerant log maintained.' },
      { ref: 'Mfr startup', text: 'Manufacturer startup: superheat/subcool readings, amp draw, refrigerant charge confirmation, commissioning report.' }
    ]
  }
};

// Master list of all available categories. Each job starts with all of these by default
// but can remove the ones that don't apply before work begins.
const PROGRESS_CATEGORIES = [
  { id: 'demolition', label: 'Demolition', icon: '✕' },
  { id: 'underground-sanitary', label: 'Underground Sanitary', icon: '⬇' },
  { id: 'above-ground-sanitary', label: 'Above-Ground Sanitary', icon: '▤' },
  { id: 'domestic-water', label: 'Domestic Water', icon: '◉' },
  { id: 'hydronic-water', label: 'Hydronic Water', icon: '◐' },
  { id: 'insulation', label: 'Insulation', icon: '▩' },
  { id: 'natural-gas', label: 'Natural Gas', icon: '🔥' },
  { id: 'equipment', label: 'Equipment', icon: '⚙' },
  { id: 'hvac', label: 'HVAC', icon: '◈' },
  { id: 'controls', label: 'Controls', icon: '⌘' },
  { id: 'ac', label: 'AC / Refrigeration', icon: '❄' }
];

// Normalize one progress entry (handles legacy number values and new {material, labour} objects)
function normalizeProgressEntry(v) {
  if (typeof v === 'number') return { material: v, labour: v };
  if (v && typeof v === 'object') {
    return {
      material: typeof v.material === 'number' ? v.material : 0,
      labour: typeof v.labour === 'number' ? v.labour : 0
    };
  }
  return { material: 0, labour: 0 };
}

// Compute overall job progress as { material, labour, overall } percentages.
// Only counts categories enabled for the job (or all if not specified, for legacy).
function computeJobProgress(job) {
  const enabledIds = (job.enabledCategories && job.enabledCategories.length > 0)
    ? job.enabledCategories
    : PROGRESS_CATEGORIES.map(c => c.id);
  const categories = PROGRESS_CATEGORIES.filter(c => enabledIds.includes(c.id));
  if (categories.length === 0) return { material: 0, labour: 0, overall: 0 };
  const progress = job.progress || {};
  const matSum = categories.reduce((s, c) => s + normalizeProgressEntry(progress[c.id]).material, 0);
  const labSum = categories.reduce((s, c) => s + normalizeProgressEntry(progress[c.id]).labour, 0);
  const material = Math.round(matSum / categories.length);
  const labour = Math.round(labSum / categories.length);
  return { material, labour, overall: Math.round((material + labour) / 2) };
}

// ============ STYLES ============
const styles = {
  bg: '#0a0d10',
  surface: '#13181d',
  surfaceLight: '#1c232a',
  border: '#2a3138',
  borderLight: '#3a434c',
  text: '#e8ecef',
  textDim: '#8a96a0',
  textFaint: '#5a6670',
  yellow: '#f5c518',
  yellowDim: '#8a6e0d',
  steel: '#5b8db8',
  steelDark: '#2d4860',
  red: '#e85d4a',
  green: '#4ab07a',
  orange: '#e89545'
};

// ============ MAIN APP ============
export default function PMCJobManager() {
  const [view, setView] = useState('today'); // today | jobs | job | folder | service | library | mattgpt | employees | timesheets | schedule | bulletin
  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewJob, setShowNewJob] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [storageOk, setStorageOk] = useState(true);
  const [library, setLibrary] = useState({ codes: [], manuals: [], specs: [], pmcStandards: [], safety: [] });
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [serviceCalls, setServiceCalls] = useState([]);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [bulletinPosts, setBulletinPosts] = useState([]);

  // Load jobs and library on mount
  useEffect(() => {
    (async () => {
      if (!storage.available()) {
        console.error('[PMC] window.storage API not available in this environment');
        setStorageOk(false);
        setLoading(false);
        return;
      }
      try {
        const keys = await storage.list('job:');
        console.log(`[PMC] Found ${keys.length} stored jobs`);
        const loaded = [];
        for (const k of keys) {
          const j = await storage.get(k);
          if (j) loaded.push(j);
        }
        setJobs(loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        // Load library
        const lib = await storage.get('library');
        if (lib) setLibrary(lib);
        // Load employees
        const emp = await storage.get('employees');
        if (emp) setEmployees(emp);
        // Load timesheets
        const tsKeys = await storage.list('ts:');
        const loadedTs = [];
        for (const k of tsKeys) {
          const ts = await storage.get(k);
          if (ts) loadedTs.push(ts);
        }
        setTimesheets(loadedTs.sort((a, b) => (b.weekEnding || '').localeCompare(a.weekEnding || '')));
        // Load service calls
        const scKeys = await storage.list('sc:');
        const loadedSc = [];
        for (const k of scKeys) {
          const sc = await storage.get(k);
          if (sc) loadedSc.push(sc);
        }
        setServiceCalls(loadedSc.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        // Load schedule events
        const sched = await storage.get('schedule');
        if (sched) setScheduleEvents(sched);
        // Load bulletin posts
        const bull = await storage.get('bulletin');
        if (bull) setBulletinPosts(bull);
      } catch (err) {
        console.error('[PMC] Failed to load jobs:', err);
        setStorageOk(false);
      }
      setLoading(false);
    })();
  }, []);

  const saveJob = async (job) => {
    // Update UI immediately so it feels responsive
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === job.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = job;
        return copy;
      }
      return [job, ...prev];
    });
    // Then persist
    setSaveStatus('saving');
    const ok = await storage.set(`job:${job.id}`, job);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveLibrary = async (lib) => {
    setLibrary(lib);
    setSaveStatus('saving');
    const ok = await storage.set('library', lib);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveEmployees = async (emp) => {
    setEmployees(emp);
    setSaveStatus('saving');
    const ok = await storage.set('employees', emp);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveTimesheet = async (ts) => {
    setTimesheets(prev => {
      const idx = prev.findIndex(t => t.id === ts.id);
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = ts; return copy;
      }
      return [ts, ...prev].sort((a, b) => (b.weekEnding || '').localeCompare(a.weekEnding || ''));
    });
    setSaveStatus('saving');
    const ok = await storage.set(`ts:${ts.id}`, ts);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const deleteTimesheet = async (id) => {
    await storage.delete(`ts:${id}`);
    setTimesheets(prev => prev.filter(t => t.id !== id));
  };

  const saveServiceCall = async (sc) => {
    setServiceCalls(prev => {
      const idx = prev.findIndex(s => s.id === sc.id);
      if (idx >= 0) {
        const copy = [...prev]; copy[idx] = sc; return copy;
      }
      return [sc, ...prev];
    });
    setSaveStatus('saving');
    const ok = await storage.set(`sc:${sc.id}`, sc);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const deleteServiceCall = async (id) => {
    await storage.delete(`sc:${id}`);
    setServiceCalls(prev => prev.filter(s => s.id !== id));
  };

  const saveSchedule = async (events) => {
    setScheduleEvents(events);
    setSaveStatus('saving');
    const ok = await storage.set('schedule', events);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const saveBulletin = async (posts) => {
    setBulletinPosts(posts);
    setSaveStatus('saving');
    const ok = await storage.set('bulletin', posts);
    setSaveStatus(ok ? 'saved' : 'error');
    if (!ok) setStorageOk(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const deleteJob = async (id) => {
    await storage.delete(`job:${id}`);
    setJobs(prev => prev.filter(j => j.id !== id));
    if (activeJobId === id) {
      setActiveJobId(null);
      setView('jobs');
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(jobs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pmc-jobs-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        for (const j of imported) {
          if (j.id) await storage.set(`job:${j.id}`, j);
        }
        setJobs(imported.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        alert(`Imported ${imported.length} jobs`);
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const activeJob = jobs.find(j => j.id === activeJobId);

  return (
    <div style={{ minHeight: '100vh', background: styles.bg, color: styles.text, fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace', paddingBottom: 70 }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* Industrial header bar */}
      <div style={{
        borderBottom: `2px solid ${styles.yellow}`,
        background: `linear-gradient(180deg, ${styles.surface} 0%, ${styles.bg} 100%)`,
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{
          background: `repeating-linear-gradient(135deg, ${styles.yellow}, ${styles.yellow} 20px, ${styles.bg} 20px, ${styles.bg} 40px)`,
          height: 6
        }} />
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={PMC_LOGO} alt="PMC" style={{
              width: 44, height: 44, objectFit: 'contain', flexShrink: 0,
              borderRadius: 4
            }} />
            <div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 600, letterSpacing: 1, lineHeight: 1 }}>JOB MANAGER</div>
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Prestige Mechanical Contracting</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Save status indicator */}
            <div style={{
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 6,
              color: saveStatus === 'saved' ? styles.green : saveStatus === 'saving' ? styles.yellow : saveStatus === 'error' ? styles.red : styles.textFaint
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: saveStatus === 'saved' ? styles.green : saveStatus === 'saving' ? styles.yellow : saveStatus === 'error' ? styles.red : styles.textFaint,
                animation: saveStatus === 'saving' ? 'pulse 1s infinite' : 'none'
              }} />
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : `${jobs.length} ${jobs.length === 1 ? 'Job' : 'Jobs'}`}
            </div>
            {/* Schedule button */}
            <button onClick={() => { setView('schedule'); setActiveJobId(null); }} title="Company Schedule" style={{
              background: view === 'schedule' ? styles.yellow : 'none',
              border: `1px solid ${view === 'schedule' ? styles.yellow : styles.border}`,
              color: view === 'schedule' ? styles.bg : styles.text,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}><Calendar size={12} /> SCHEDULE</button>
            {/* Bulletin button */}
            <button onClick={() => { setView('bulletin'); setActiveJobId(null); }} title="Crew Bulletin Board" style={{
              background: view === 'bulletin' ? styles.yellow : 'none',
              border: `1px solid ${view === 'bulletin' ? styles.yellow : styles.border}`,
              color: view === 'bulletin' ? styles.bg : styles.text,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              position: 'relative'
            }}>
              <ClipboardList size={12} /> BULLETIN
              {bulletinPosts.filter(p => !p.archived).length > 0 && (
                <span style={{
                  background: styles.red, color: styles.bg,
                  fontSize: 9, fontWeight: 700, padding: '0 5px', borderRadius: 8, marginLeft: 2
                }}>{bulletinPosts.filter(p => !p.archived).length}</span>
              )}
            </button>
            {/* Timesheets button */}
            <button onClick={() => { setView('timesheets'); setActiveJobId(null); }} title="Timesheets" style={{
              background: view === 'timesheets' ? styles.yellow : 'none',
              border: `1px solid ${view === 'timesheets' ? styles.yellow : styles.border}`,
              color: view === 'timesheets' ? styles.bg : styles.text,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}><Clock size={12} /> HOURS</button>
            {/* Employees button */}
            <button onClick={() => { setView('employees'); setActiveJobId(null); }} title="Manage Employees" style={{
              background: view === 'employees' ? styles.yellow : 'none',
              border: `1px solid ${view === 'employees' ? styles.yellow : styles.border}`,
              color: view === 'employees' ? styles.bg : styles.text,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}><User size={12} /> CREW</button>
            {/* Export / Import */}
            <button onClick={exportData} disabled={jobs.length === 0} style={{
              background: 'none', border: `1px solid ${styles.border}`, color: jobs.length ? styles.text : styles.textFaint,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: jobs.length ? 'pointer' : 'not-allowed'
            }}>EXPORT</button>
            <label style={{
              background: 'none', border: `1px solid ${styles.border}`, color: styles.text,
              padding: '6px 10px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer'
            }}>
              IMPORT
              <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>

      {!storageOk && (
        <div style={{
          background: styles.red, color: styles.bg, padding: '10px 20px',
          fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          textAlign: 'center'
        }}>
          ⚠ PERSISTENT STORAGE UNAVAILABLE — Use EXPORT button to download your data before closing. Data will not survive a refresh.
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: styles.textDim }}>Loading…</div>
      ) : view === 'today' ? (
        <TodayView
          jobs={jobs}
          onOpenJob={(id) => { setActiveJobId(id); setView('job'); }}
          onOpenFolder={(jobId, folder) => { setActiveJobId(jobId); setActiveFolder(folder); setView('folder'); }}
          onNewJob={() => setShowNewJob(true)}
          bulletinPosts={bulletinPosts}
          scheduleEvents={scheduleEvents}
          onOpenBulletin={() => setView('bulletin')}
          onOpenSchedule={() => setView('schedule')}
        />
      ) : view === 'jobs' ? (
        <JobsList
          jobs={jobs}
          onOpen={(id) => { setActiveJobId(id); setView('job'); }}
          onNew={() => setShowNewJob(true)}
          onDelete={deleteJob}
        />
      ) : view === 'job' && activeJob ? (
        <JobView
          job={activeJob}
          onBack={() => { setView('jobs'); setActiveJobId(null); }}
          onSave={saveJob}
          onOpenFolder={(f) => { setActiveFolder(f); setView('folder'); }}
        />
      ) : view === 'folder' && activeJob ? (
        <FolderView
          job={activeJob}
          folder={activeFolder}
          onBack={() => setView('job')}
          onSave={saveJob}
          employees={employees}
        />
      ) : view === 'library' ? (
        <LibraryView library={library} onSave={saveLibrary} onBack={() => setView('today')} />
      ) : view === 'mattgpt' ? (
        <MattGPTView library={library} onBack={() => setView('today')} onGoToLibrary={() => setView('library')} />
      ) : view === 'service' ? (
        <ServiceView
          serviceCalls={serviceCalls}
          employees={employees}
          onSave={saveServiceCall}
          onDelete={deleteServiceCall}
          onBack={() => setView('today')}
        />
      ) : view === 'timesheets' ? (
        <TimesheetsView
          timesheets={timesheets}
          jobs={jobs}
          serviceCalls={serviceCalls}
          employees={employees}
          onSave={saveTimesheet}
          onDelete={deleteTimesheet}
          onBack={() => setView('today')}
        />
      ) : view === 'employees' ? (
        <EmployeesView employees={employees} onSave={saveEmployees} onBack={() => setView('today')} />
      ) : view === 'schedule' ? (
        <ScheduleView events={scheduleEvents} employees={employees} onSave={saveSchedule} onBack={() => setView('today')} />
      ) : view === 'bulletin' ? (
        <BulletinView posts={bulletinPosts} employees={employees} onSave={saveBulletin} onBack={() => setView('today')} />
      ) : null}

      {/* Bottom navigation - mobile-friendly fixed bar */}
      {!loading && (
        <BottomNav
          currentView={view}
          onNavigate={(v) => {
            if (v === 'today') { setView('today'); setActiveJobId(null); }
            else if (v === 'jobs') { setView('jobs'); setActiveJobId(null); }
            else if (v === 'service') { setView('service'); setActiveJobId(null); }
            else if (v === 'library') { setView('library'); setActiveJobId(null); }
            else if (v === 'mattgpt') { setView('mattgpt'); setActiveJobId(null); }
            else if (v === 'employees') { setView('employees'); setActiveJobId(null); }
            else if (v === 'timesheets') { setView('timesheets'); setActiveJobId(null); }
            else if (v === 'schedule') { setView('schedule'); setActiveJobId(null); }
            else if (v === 'bulletin') { setView('bulletin'); setActiveJobId(null); }
          }}
          onQuickAdd={() => setShowQuickAdd(true)}
        />
      )}

      {showQuickAdd && (
        <QuickAddModal
          jobs={jobs}
          activeJobId={activeJobId}
          onClose={() => setShowQuickAdd(false)}
          onSave={saveJob}
        />
      )}

      {showNewJob && (
        <NewJobModal
          onClose={() => setShowNewJob(false)}
          onCreate={async (data) => {
            const newJob = {
              id: `j_${Date.now()}`,
              createdAt: Date.now(),
              jobName: data.jobName,
              jobNumber: data.jobNumber,
              location: '',
              client: '',
              startDate: '',
              targetDate: '',
              contacts: [],
              notes: '',
              ifcs: [],
              shopDrawings: [],
              rfis: [],
              changeOrders: [],
              tools: [],
              photos: [],
              materialOrders: [],
              tasks: [],
              activity: [{
                id: `a_${Date.now()}`,
                at: Date.now(),
                type: 'job_created',
                text: `Job created: ${data.jobName}`
              }],
              progress: PROGRESS_CATEGORIES.reduce((a, c) => ({ ...a, [c.id]: { material: 0, labour: 0 } }), {}),
              enabledCategories: PROGRESS_CATEGORIES.map(c => c.id)
            };
            await saveJob(newJob);
            setShowNewJob(false);
            setActiveJobId(newJob.id);
            setView('job');
          }}
        />
      )}
    </div>
  );
}

// ============ JOBS LIST ============
function JobsList({ jobs, onOpen, onNew, onDelete }) {
  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 26, fontWeight: 600, letterSpacing: 2 }}>ACTIVE JOBS</div>
          <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 4 }}>SELECT JOB TO OPEN ・ TAP + TO CREATE</div>
        </div>
        <button onClick={onNew} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '12px 20px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
          fontSize: 13, letterSpacing: 1.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          clipPath: 'polygon(0 0, 100% 0, 100% 75%, 92% 100%, 0 100%)'
        }}>
          <Plus size={16} strokeWidth={3} /> NEW JOB
        </button>
      </div>

      {jobs.length === 0 ? (
        <div style={{
          border: `2px dashed ${styles.border}`, padding: 60, textAlign: 'center',
          background: styles.surface
        }}>
          <HardHat size={48} color={styles.yellowDim} style={{ margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, letterSpacing: 1.5, color: styles.textDim }}>NO JOBS YET</div>
          <div style={{ fontSize: 12, color: styles.textFaint, marginTop: 8 }}>Click "NEW JOB" to start tracking</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {jobs.map(job => {
            const { overall: progressAvg } = computeJobProgress(job);
            const openRfis = (job.rfis || []).filter(r => r.status !== 'complete').length;
            const openCos = (job.changeOrders || []).filter(c => c.status !== 'complete').length;
            return (
              <div key={job.id} style={{
                background: styles.surface, border: `1px solid ${styles.border}`,
                cursor: 'pointer', position: 'relative',
                transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = styles.yellow; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = styles.border; e.currentTarget.style.transform = 'none'; }}
                onClick={() => onOpen(job.id)}
              >
                <div style={{ background: styles.yellow, height: 3, width: `${progressAvg}%`, transition: 'width 0.3s' }} />
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: styles.yellow, letterSpacing: 1.5, fontWeight: 600 }}>JOB #{job.jobNumber || '—'}</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>{job.jobName}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${job.jobName}"?`)) onDelete(job.id); }} style={{ background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {job.location && (
                    <div style={{ fontSize: 11, color: styles.textDim, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <MapPin size={11} /> {job.location}
                    </div>
                  )}
                  {job.client && (
                    <div style={{ fontSize: 11, color: styles.textDim, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Building2 size={11} /> {job.client}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${styles.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: styles.textFaint, letterSpacing: 1.5 }}>PROGRESS</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: styles.yellow }}>{progressAvg}%</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: styles.textFaint, letterSpacing: 1.5 }}>OPEN RFI</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: openRfis ? styles.orange : styles.text }}>{openRfis}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: styles.textFaint, letterSpacing: 1.5 }}>OPEN CO</div>
                      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, color: openCos ? styles.orange : styles.text }}>{openCos}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ NEW JOB MODAL ============
function NewJobModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [num, setNum] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20
    }}>
      <div style={{ background: styles.surface, border: `2px solid ${styles.yellow}`, padding: 28, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 20, letterSpacing: 1.5 }}>NEW JOB</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: styles.text, cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <Field label="Job Name" value={name} onChange={setName} placeholder="e.g. Surrey Memorial Tower B" />
        <Field label="Job Number" value={num} onChange={setNum} placeholder="e.g. 2026-014" />
        <button
          onClick={() => name.trim() && onCreate({ jobName: name.trim(), jobNumber: num.trim() })}
          disabled={!name.trim()}
          style={{
            width: '100%', marginTop: 12, padding: 14, background: name.trim() ? styles.yellow : styles.surfaceLight,
            color: name.trim() ? styles.bg : styles.textFaint, border: 'none',
            fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 1.5,
            cursor: name.trim() ? 'pointer' : 'not-allowed'
          }}
        >CREATE JOB</button>
      </div>
    </div>
  );
}

// ============ BACK BUTTON (reusable, prominent) ============
function BackButton({ onClick, label = 'BACK' }) {
  return (
    <button onClick={onClick} style={{
      background: styles.surfaceLight,
      border: `1px solid ${styles.border}`,
      color: styles.text,
      padding: '10px 16px',
      fontSize: 12, letterSpacing: 1.5,
      fontFamily: 'Oswald, sans-serif', fontWeight: 600,
      cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      marginBottom: 16,
      transition: 'all 0.15s'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = styles.yellow; e.currentTarget.style.color = styles.yellow; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = styles.border; e.currentTarget.style.color = styles.text; }}
    >
      <ChevronLeft size={18} strokeWidth={2.5} />
      {label.toUpperCase()}
    </button>
  );
}

// ============ FIELD COMPONENT ============
function Field({ label, value, onChange, placeholder, multiline, type = 'text' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%', padding: 10, background: styles.bg,
            border: `1px solid ${styles.border}`, color: styles.text,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, resize: 'vertical', outline: 'none'
          }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: 10, background: styles.bg,
            border: `1px solid ${styles.border}`, color: styles.text,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = styles.yellow}
          onBlur={e => e.target.style.borderColor = styles.border}
        />
      )}
    </div>
  );
}

// ============ JOB VIEW ============
function JobView({ job, onBack, onSave, onOpenFolder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(job);

  useEffect(() => { setDraft(job); }, [job.id]);

  const update = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const saveEdits = async () => { await onSave(draft); setEditing(false); };

  const openTasks = (() => {
    let n = 0;
    (job.tasks || []).forEach(it => {
      if (it.kind === 'folder') {
        n += (it.items || []).filter(s => !s.done).length;
      } else if (!it.done) {
        n++;
      }
    });
    return n;
  })();
  const folders = [
    { id: 'tasks', label: 'Tasks', icon: ListChecks, count: openTasks, countLabel: openTasks === 1 ? 'OPEN' : 'OPEN', color: styles.yellow, primary: true },
    { id: 'ifcs', label: 'IFCs', icon: FileText, count: (job.ifcs || []).length, color: styles.steel },
    { id: 'shop-drawings', label: 'Shop Drawings', icon: FileText, count: (job.shopDrawings || []).length, color: styles.steel },
    { id: 'rfis', label: 'RFIs', icon: AlertCircle, count: (job.rfis || []).length, color: styles.orange },
    { id: 'change-orders', label: 'Change Orders', icon: ClipboardList, count: (job.changeOrders || []).length, color: styles.orange },
    { id: 'tools', label: 'Tools', icon: Wrench, count: (job.tools || []).length, color: styles.text },
    { id: 'photos', label: 'Photos', icon: Camera, count: (job.photos || []).length, color: styles.steel },
    { id: 'materials', label: 'Material Orders', icon: Package, count: (job.materialOrders || []).length, color: styles.text },
    { id: 'progress', label: 'Progress Report', icon: BarChart3, count: null, color: styles.yellow },
    { id: 'activity', label: 'Activity Feed', icon: Activity, count: (job.activity || []).length, color: styles.steel }
  ];

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="All Jobs" />

      {/* Job Header */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, marginBottom: 20 }}>
        <div style={{ background: styles.yellow, height: 4 }} />
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: styles.yellow, letterSpacing: 2, fontWeight: 600 }}>JOB #{job.jobNumber || '—'}</div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 28, fontWeight: 600, letterSpacing: 0.5, marginTop: 4 }}>{job.jobName}</div>
            </div>
            <button onClick={() => editing ? saveEdits() : setEditing(true)} style={{
              background: editing ? styles.yellow : styles.surfaceLight,
              color: editing ? styles.bg : styles.text,
              border: `1px solid ${editing ? styles.yellow : styles.border}`,
              padding: '8px 14px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>{editing ? <><Check size={14} /> SAVE</> : <><Edit3 size={14} /> EDIT HEADER</>}</button>
          </div>

          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <Field label="Job Name" value={draft.jobName} onChange={v => update('jobName', v)} />
              <Field label="Job Number" value={draft.jobNumber} onChange={v => update('jobNumber', v)} />
              <Field label="Client / GC" value={draft.client} onChange={v => update('client', v)} />
              <Field label="Location / Address" value={draft.location} onChange={v => update('location', v)} />
              <Field label="Start Date" type="date" value={draft.startDate} onChange={v => update('startDate', v)} />
              <Field label="Target Completion" type="date" value={draft.targetDate} onChange={v => update('targetDate', v)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <ContactsEditor contacts={draft.contacts || []} onChange={v => update('contacts', v)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Job Notes" value={draft.notes} onChange={v => update('notes', v)} multiline placeholder="Site access notes, parking, security, key contacts..." />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <InfoCell label="Client / GC" value={job.client} icon={Building2} />
              <LocationCell location={job.location} />
              <InfoCell label="Start" value={job.startDate} icon={Calendar} />
              <InfoCell label="Target" value={job.targetDate} icon={Calendar} />
              {(job.contacts || []).length > 0 && (
                <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${styles.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>SITE CONTACTS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                    {(job.contacts || []).map((c, i) => (
                      <ContactCard key={i} contact={c} jobName={job.jobName} />
                    ))}
                  </div>
                </div>
              )}
              {job.notes && (
                <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${styles.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 12, color: styles.text, whiteSpace: 'pre-wrap' }}>{job.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Folder grid */}
      <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 2, marginBottom: 12 }}>JOB FOLDERS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {folders.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.id} onClick={() => onOpenFolder(f.id)}
              style={{
                background: styles.surface, border: `1px solid ${styles.border}`,
                padding: 18, cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = styles.border; e.currentTarget.style.transform = 'none'; }}
            >
              <Icon size={22} color={f.color} style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1, fontWeight: 600 }}>{f.label.toUpperCase()}</div>
              {f.count !== null && (
                <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1, marginTop: 4 }}>{f.count} {f.count === 1 ? 'ITEM' : 'ITEMS'}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCell({ label, value, icon: Icon }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={12} color={styles.textDim} />}
        {value || <span style={{ color: styles.textFaint }}>—</span>}
      </div>
    </div>
  );
}

// ============ LOCATION CELL (tappable Google Maps link) ============
function LocationCell({ location }) {
  if (!location) {
    return (
      <div>
        <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>LOCATION</div>
        <div style={{ fontSize: 13, color: styles.textFaint }}>—</div>
      </div>
    );
  }
  // Universal maps link — works on iPhone (opens Apple Maps), Android (Google Maps), desktop (Google Maps web)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  return (
    <div>
      <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>LOCATION</div>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
        fontSize: 13, color: styles.steel, display: 'inline-flex', alignItems: 'center', gap: 6,
        textDecoration: 'none', borderBottom: `1px dashed ${styles.steelDark}`, paddingBottom: 2
      }}
        onMouseEnter={e => { e.currentTarget.style.color = styles.yellow; e.currentTarget.style.borderColor = styles.yellow; }}
        onMouseLeave={e => { e.currentTarget.style.color = styles.steel; e.currentTarget.style.borderColor = styles.steelDark; }}
      >
        <MapPin size={12} />
        <span>{location}</span>
        <ExternalLink size={10} style={{ opacity: 0.6 }} />
      </a>
      <div style={{ fontSize: 9, color: styles.textFaint, marginTop: 3, letterSpacing: 0.5 }}>TAP TO OPEN IN MAPS</div>
    </div>
  );
}

// ============ CONTACT CARD (with vCard download for iPhone Contacts) ============
function ContactCard({ contact, jobName }) {
  const c = contact;

  // Generate vCard string — opens in iOS Contacts when downloaded as .vcf file
  const downloadVCard = () => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name || ''}`,
      `N:${c.name || ''};;;;`,
      c.role && `TITLE:${c.role}`,
      jobName && `ORG:${jobName}`,
      c.phone && `TEL;TYPE=CELL:${c.phone}`,
      c.email && `EMAIL:${c.email}`,
      `NOTE:Site contact for ${jobName || 'PMC job'}`,
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([lines], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.name || 'contact'}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: styles.bg, padding: 10, border: `1px solid ${styles.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
          {c.role && <div style={{ fontSize: 10, color: styles.yellow, letterSpacing: 1, marginBottom: 6 }}>{c.role}</div>}
          {c.phone && (
            <a href={`tel:${c.phone.replace(/\s/g, '')}`} style={{
              fontSize: 12, color: styles.text, display: 'flex', alignItems: 'center', gap: 6,
              textDecoration: 'none', marginBottom: 3
            }}>
              <Phone size={11} color={styles.steel} />
              <span style={{ borderBottom: `1px dashed ${styles.steelDark}` }}>{c.phone}</span>
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} style={{
              fontSize: 11, color: styles.text, display: 'flex', alignItems: 'center', gap: 6,
              textDecoration: 'none', marginBottom: 3
            }}>
              <Mail size={11} color={styles.steel} />
              <span style={{ borderBottom: `1px dashed ${styles.steelDark}`, wordBreak: 'break-all' }}>{c.email}</span>
            </a>
          )}
        </div>
        <button
          onClick={downloadVCard}
          title="Save to iPhone Contacts"
          style={{
            background: styles.steel, color: styles.bg, border: 'none',
            padding: '4px 8px', cursor: 'pointer',
            fontFamily: 'Oswald, sans-serif', fontSize: 9, letterSpacing: 1, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
          }}
        >
          <User size={10} /> SAVE
        </button>
      </div>
    </div>
  );
}

// ============ CONTACTS EDITOR ============
function ContactsEditor({ contacts, onChange }) {
  const add = () => onChange([...contacts, { name: '', role: '', phone: '', email: '' }]);
  const update = (i, k, v) => {
    const copy = [...contacts]; copy[i] = { ...copy[i], [k]: v }; onChange(copy);
  };
  const remove = (i) => onChange(contacts.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5 }}>SITE CONTACTS</div>
        <button onClick={add} style={{
          background: styles.surfaceLight, color: styles.text, border: `1px solid ${styles.border}`,
          padding: '4px 10px', fontSize: 10, letterSpacing: 1, cursor: 'pointer', fontFamily: 'Oswald, sans-serif'
        }}>+ ADD CONTACT</button>
      </div>
      {contacts.map((c, i) => (
        <div key={i} style={{ background: styles.bg, padding: 10, border: `1px solid ${styles.border}`, marginBottom: 8, position: 'relative' }}>
          <button onClick={() => remove(i)} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer' }}><X size={14} /></button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            <Field label="Name" value={c.name} onChange={v => update(i, 'name', v)} />
            <Field label="Role" value={c.role} onChange={v => update(i, 'role', v)} placeholder="Super, PM, GC..." />
            <Field label="Phone" value={c.phone} onChange={v => update(i, 'phone', v)} />
            <Field label="Email" value={c.email} onChange={v => update(i, 'email', v)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ FOLDER VIEW ROUTER ============
function FolderView({ job, folder, onBack, onSave, employees }) {
  const wrap = (title, children) => (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <BackButton onClick={onBack} label={job.jobName} />
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 24, letterSpacing: 1.5, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );

  // Helper to add an activity log entry whenever something changes
  const saveWithActivity = (changes, activityText, activityType = 'update') => {
    const newActivity = {
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      type: activityType,
      text: activityText
    };
    const updatedJob = {
      ...job,
      ...changes,
      activity: [newActivity, ...(job.activity || [])]
    };
    onSave(updatedJob);
  };

  switch (folder) {
    case 'tasks':
      return wrap('JOB TASKS', <TasksList items={job.tasks || []} onChange={(v, msg) => saveWithActivity({ tasks: v }, msg || 'Tasks updated', 'task')} employees={employees || []} />);
    case 'ifcs':
      return wrap('IFC DRAWINGS', <FilesList items={job.ifcs || []} onChange={v => onSave({ ...job, ifcs: v })} fileType="IFC" />);
    case 'shop-drawings':
      return wrap('SHOP DRAWINGS', <FilesList items={job.shopDrawings || []} onChange={v => onSave({ ...job, shopDrawings: v })} fileType="SHOP" />);
    case 'rfis':
      return wrap('RFIs', <NotesList items={job.rfis || []} onChange={(v, msg) => saveWithActivity({ rfis: v }, msg || 'RFI updated', 'rfi')} type="rfi" />);
    case 'change-orders':
      return wrap('CHANGE ORDERS', <NotesList items={job.changeOrders || []} onChange={(v, msg) => saveWithActivity({ changeOrders: v }, msg || 'CO updated', 'co')} type="co" />);
    case 'tools':
      return wrap('TOOLS CHECKLIST', <ToolsList items={job.tools || []} onChange={(v, msg) => saveWithActivity({ tools: v }, msg || 'Tools updated', 'tool')} />);
    case 'photos':
      return wrap('PHOTOS', <PhotosList items={job.photos || []} onChange={(v, msg) => saveWithActivity({ photos: v }, msg || 'Photo added', 'photo')} />);
    case 'materials':
      return wrap('MATERIAL ORDERS', <MaterialsList items={job.materialOrders || []} onChange={(v, msg) => saveWithActivity({ materialOrders: v }, msg || 'Materials updated', 'material')} jobName={job.jobName} jobNumber={job.jobNumber} />);
    case 'progress':
      return wrap('PROGRESS REPORT', <ProgressView
        progress={job.progress || {}}
        enabledCategories={job.enabledCategories || PROGRESS_CATEGORIES.map(c => c.id)}
        onChange={(v, msg) => saveWithActivity({ progress: v }, msg || 'Progress updated', 'progress')}
        onChangeEnabled={(v, msg) => saveWithActivity({ enabledCategories: v }, msg || 'Categories updated', 'progress')}
      />);
    case 'activity':
      return wrap('ACTIVITY FEED', <ActivityView activity={job.activity || []} />);
    default:
      return wrap('FOLDER', <div>Unknown folder</div>);
  }
}

// ============ FILES LIST (PDFs - link based) ============
function FilesList({ items, onChange, fileType }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', url: '', revision: '', date: '', notes: '' });

  const add = () => {
    if (!draft.name.trim()) return;
    onChange([{ id: `f_${Date.now()}`, ...draft, addedAt: Date.now() }, ...items]);
    setDraft({ name: '', url: '', revision: '', date: '', notes: '' });
    setAdding(false);
  };
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  return (
    <>
      <div style={{
        background: styles.surface, border: `1px solid ${styles.border}`,
        padding: 16, marginBottom: 16
      }}>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>📎 LINK-BASED STORAGE (Phase 1)</div>
        <div style={{ fontSize: 12, color: styles.text, lineHeight: 1.5 }}>
          Paste links to {fileType} drawings hosted on Dropbox, SharePoint, OneDrive, or Google Drive. Phase 2 will add direct upload + version control.
        </div>
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', marginBottom: 16, fontWeight: 700
        }}>+ ADD {fileType}</button>
      ) : (
        <div style={{ background: styles.surface, border: `1px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <Field label="Drawing Name / Number" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} placeholder="M-101 Mech Plan" />
            <Field label="Revision" value={draft.revision} onChange={v => setDraft({ ...draft, revision: v })} placeholder="Rev 3" />
            <Field label="Date Issued" type="date" value={draft.date} onChange={v => setDraft({ ...draft, date: v })} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Link (Dropbox/SharePoint URL)" value={draft.url} onChange={v => setDraft({ ...draft, url: v })} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Notes" value={draft.notes} onChange={v => setDraft({ ...draft, notes: v })} multiline />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={add} style={{ background: styles.yellow, color: styles.bg, border: 'none', padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>SAVE</button>
            <button onClick={() => setAdding(false)} style={{ background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`, padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <FileText size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No {fileType} drawings yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={20} color={styles.steel} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2, display: 'flex', gap: 12 }}>
                  {item.revision && <span>{item.revision}</span>}
                  {item.date && <span>{item.date}</span>}
                </div>
                {item.notes && <div style={{ fontSize: 11, color: styles.textDim, marginTop: 4 }}>{item.notes}</div>}
              </div>
              {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: styles.yellow, padding: 6 }}><ExternalLink size={16} /></a>}
              <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer', padding: 6 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============ NOTES LIST (RFIs / COs) ============
function NotesList({ items, onChange, type }) {
  const [tab, setTab] = useState('issued');
  const [adding, setAdding] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [draft, setDraft] = useState(blankNote(type));

  function blankNote(t) {
    return {
      number: '', date: new Date().toISOString().slice(0, 10),
      subject: '', drawingRef: '', question: '', response: '',
      impact: '', status: 'issued',
      ...(t === 'co' ? { costImpact: '', scheduleImpact: '' } : {})
    };
  }

  const add = () => {
    if (!draft.subject.trim()) return;
    onChange([{ id: `n_${Date.now()}`, ...draft, createdAt: Date.now() }, ...items]);
    setDraft(blankNote(type));
    setAdding(false);
  };
  const update = (id, changes) => onChange(items.map(i => i.id === id ? { ...i, ...changes } : i));
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  const tabs = [
    { id: 'issued', label: 'Issued', icon: Clock, color: styles.steel },
    { id: 'action', label: 'Action Needed', icon: AlertTriangle, color: styles.orange },
    { id: 'complete', label: 'Complete', icon: CheckCircle2, color: styles.green }
  ];
  const filtered = items.filter(i => i.status === tab);

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}` }}>
        {tabs.map(t => {
          const Ic = t.icon;
          const count = items.filter(i => i.status === t.id).length;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', color: active ? t.color : styles.textDim,
              padding: '10px 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? t.color : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
            }}>
              <Ic size={14} /> {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setAdding(!adding)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700
        }}>+ NEW {type === 'rfi' ? 'RFI' : 'CHANGE ORDER'}</button>
        {type === 'rfi' && (
          <button onClick={() => setShowTemplates(!showTemplates)} style={{
            background: styles.surfaceLight, color: styles.text, border: `1px solid ${styles.border}`,
            padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
          }}>📋 USE TEMPLATE</button>
        )}
      </div>

      {showTemplates && type === 'rfi' && (
        <div style={{ background: styles.surface, border: `1px solid ${styles.steel}`, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: styles.steel, letterSpacing: 1.5, marginBottom: 10 }}>RFI TEMPLATES — TAP TO USE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {RFI_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => {
                setDraft({ ...blankNote('rfi'), subject: t.subject, question: t.question });
                setAdding(true);
                setShowTemplates(false);
              }} style={{
                background: styles.bg, border: `1px solid ${styles.border}`, color: styles.text,
                padding: 10, textAlign: 'left', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 10, color: styles.textDim, marginTop: 4 }}>{t.subject}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {adding && (
        <div style={{ background: styles.surface, border: `1px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <Field label={`${type === 'rfi' ? 'RFI' : 'CO'} #`} value={draft.number} onChange={v => setDraft({ ...draft, number: v })} placeholder="001" />
            <Field label="Date" type="date" value={draft.date} onChange={v => setDraft({ ...draft, date: v })} />
            <Field label="Drawing Ref" value={draft.drawingRef} onChange={v => setDraft({ ...draft, drawingRef: v })} placeholder="M-101" />
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Subject" value={draft.subject} onChange={v => setDraft({ ...draft, subject: v })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label={type === 'rfi' ? 'Question' : 'Description of Change'} value={draft.question} onChange={v => setDraft({ ...draft, question: v })} multiline />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Impact / Notes" value={draft.impact} onChange={v => setDraft({ ...draft, impact: v })} multiline placeholder="Schedule, cost, scope impact..." />
            </div>
            {type === 'co' && <>
              <Field label="Cost Impact ($)" value={draft.costImpact} onChange={v => setDraft({ ...draft, costImpact: v })} />
              <Field label="Schedule Impact (days)" value={draft.scheduleImpact} onChange={v => setDraft({ ...draft, scheduleImpact: v })} />
            </>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={add} style={{ background: styles.yellow, color: styles.bg, border: 'none', padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>SAVE</button>
            <button onClick={() => { setAdding(false); setDraft(blankNote(type)); }} style={{ background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`, padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <div style={{ fontSize: 12 }}>No items in {tabs.find(t => t.id === tab).label.toLowerCase()}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, color: styles.yellow, letterSpacing: 1.5, fontWeight: 600 }}>{type === 'rfi' ? 'RFI' : 'CO'} #{item.number || '—'}</span>
                    <span style={{ fontSize: 10, color: styles.textDim }}>{item.date}</span>
                    {item.drawingRef && <span style={{ fontSize: 10, color: styles.textDim }}>📐 {item.drawingRef}</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{item.subject}</div>
                </div>
                <button onClick={() => remove(item.id)} style={{ background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
              {item.question && <div style={{ fontSize: 12, color: styles.text, marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.question}</div>}
              {item.impact && <div style={{ fontSize: 11, color: styles.orange, marginTop: 8, padding: 8, background: styles.bg, borderLeft: `2px solid ${styles.orange}` }}>⚠ {item.impact}</div>}
              {(item.costImpact || item.scheduleImpact) && (
                <div style={{ fontSize: 11, color: styles.textDim, marginTop: 8, display: 'flex', gap: 16 }}>
                  {item.costImpact && <span>💰 ${item.costImpact}</span>}
                  {item.scheduleImpact && <span>📅 {item.scheduleImpact} days</span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${styles.border}` }}>
                {tabs.map(t => (
                  <button key={t.id} onClick={() => update(item.id, { status: t.id })} style={{
                    background: item.status === t.id ? t.color : 'transparent',
                    color: item.status === t.id ? styles.bg : styles.textDim,
                    border: `1px solid ${item.status === t.id ? t.color : styles.border}`,
                    padding: '4px 10px', fontSize: 9, letterSpacing: 1.5, cursor: 'pointer',
                    fontFamily: 'Oswald, sans-serif', fontWeight: 600
                  }}>{t.label.toUpperCase()}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============ TOOLS CHECKLIST ============
function ToolsList({ items, onChange }) {
  const [draftName, setDraftName] = useState('');
  const [draftDroppedBy, setDraftDroppedBy] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const add = () => {
    if (!draftName.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onChange([...items, {
      id: `t_${Date.now()}`,
      name: draftName.trim(),
      droppedBy: draftDroppedBy.trim() || '',
      droppedDate: draftDroppedBy.trim() ? today : '',
      checked: false,
      pickedUp: false,
      pickedUpBy: '',
      pickedUpDate: ''
    }]);
    setDraftName('');
    setDraftDroppedBy('');
  };

  const update = (id, changes) => onChange(items.map(i => i.id === id ? { ...i, ...changes } : i));
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  const togglePickup = (item) => {
    if (item.pickedUp) {
      update(item.id, { pickedUp: false, pickedUpBy: '', pickedUpDate: '' });
    } else {
      const who = prompt('Who picked it up?');
      if (!who) return;
      update(item.id, { pickedUp: true, pickedUpBy: who.trim(), pickedUpDate: new Date().toISOString().slice(0, 10) });
    }
  };

  const onSite = items.filter(i => !i.pickedUp).length;
  const offSite = items.filter(i => i.pickedUp).length;

  return (
    <>
      {/* Notification stub banner */}
      <div style={{
        background: styles.surface,
        border: `1px solid ${styles.steel}`,
        borderLeft: `4px solid ${styles.steel}`,
        padding: 14, marginBottom: 16,
        display: 'flex', alignItems: 'flex-start', gap: 12
      }}>
        <div style={{
          background: styles.steel, color: styles.bg,
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>🔔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1, color: styles.steel, marginBottom: 4 }}>
            NOTIFICATIONS — COMING IN PHASE 2
          </div>
          <div style={{ fontSize: 12, color: styles.text, lineHeight: 1.5 }}>
            When deployed as a real app, you'll get push notifications when tools are dropped off, picked up, or moved between sites. For now, the app tracks who/when so the data is ready when notifications go live.
          </div>
          <button onClick={() => setShowInfo(!showInfo)} style={{
            background: 'none', border: 'none', color: styles.steel,
            fontSize: 11, letterSpacing: 1, cursor: 'pointer',
            marginTop: 6, padding: 0, fontFamily: 'Oswald, sans-serif'
          }}>{showInfo ? 'HIDE DETAILS' : 'WHAT WILL YOU GET NOTIFIED ABOUT? →'}</button>
          {showInfo && (
            <div style={{ marginTop: 10, padding: 10, background: styles.bg, fontSize: 11, color: styles.textDim, lineHeight: 1.6 }}>
              <strong style={{ color: styles.text }}>Phase 2 notification triggers:</strong><br />
              • When a tool is dropped off at a job site<br />
              • When a tool is picked up / removed from a site<br />
              • Daily summary of tools on each active site<br />
              • Weekly tool location report<br />
              • Alerts when expensive tools sit unused {'>'} 7 days<br />
              • Alerts when shared tools are needed at multiple jobs<br />
              <br />
              <strong style={{ color: styles.text }}>Delivery channels:</strong> in-app, email, SMS (configurable per user)
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: styles.surface, border: `1px solid ${styles.border}`, padding: 12 }}>
            <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5 }}>ON SITE</div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 24, color: styles.yellow, marginTop: 2 }}>{onSite}</div>
          </div>
          <div style={{ flex: 1, background: styles.surface, border: `1px solid ${styles.border}`, padding: 12 }}>
            <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5 }}>PICKED UP</div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 24, color: styles.textDim, marginTop: 2 }}>{offSite}</div>
          </div>
          <div style={{ flex: 1, background: styles.surface, border: `1px solid ${styles.border}`, padding: 12 }}>
            <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5 }}>TOTAL</div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 24, color: styles.text, marginTop: 2 }}>{items.length}</div>
          </div>
        </div>
      )}

      {/* Add form */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr auto', gap: 8 }}>
          <input
            value={draftName} onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Tool / equipment..."
            style={{
              padding: 10, background: styles.bg,
              border: `1px solid ${styles.border}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
          <input
            value={draftDroppedBy} onChange={e => setDraftDroppedBy(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Dropped off by..."
            style={{
              padding: 10, background: styles.bg,
              border: `1px solid ${styles.border}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
          <button onClick={add} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '0 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
            cursor: 'pointer', fontWeight: 700
          }}>ADD</button>
        </div>
        <div style={{ fontSize: 10, color: styles.textFaint, marginTop: 6 }}>
          Tip: leave "dropped off by" blank if you don't know yet — you can edit later
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <Wrench size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No tools listed yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map(item => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} style={{
                background: styles.surface,
                border: `1px solid ${styles.border}`,
                borderLeft: `4px solid ${item.pickedUp ? styles.textFaint : item.checked ? styles.green : styles.yellow}`,
                padding: 12,
                opacity: item.pickedUp ? 0.55 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {/* Verified checkbox */}
                  <button onClick={() => update(item.id, { checked: !item.checked })} title="Verified on site" style={{
                    width: 22, height: 22, background: item.checked ? styles.green : 'transparent',
                    border: `2px solid ${item.checked ? styles.green : styles.borderLight}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    marginTop: 2
                  }}>
                    {item.checked && <Check size={14} color={styles.bg} strokeWidth={3} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      textDecoration: item.pickedUp ? 'line-through' : 'none'
                    }}>
                      {item.name}
                    </div>

                    {/* Drop-off info */}
                    <div style={{ fontSize: 11, color: styles.textDim, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {item.droppedBy ? (
                        <span>📥 <span style={{ color: styles.text }}>{item.droppedBy}</span> dropped off {item.droppedDate}</span>
                      ) : (
                        <span style={{ color: styles.textFaint, fontStyle: 'italic' }}>Drop-off info missing</span>
                      )}
                      {item.pickedUp && item.pickedUpBy && (
                        <span>📤 <span style={{ color: styles.text }}>{item.pickedUpBy}</span> picked up {item.pickedUpDate}</span>
                      )}
                    </div>

                    {/* Edit form */}
                    {isEditing && (
                      <div style={{ marginTop: 10, padding: 10, background: styles.bg, border: `1px solid ${styles.borderLight}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                          <Field label="Tool Name" value={item.name} onChange={v => update(item.id, { name: v })} />
                          <Field label="Dropped Off By" value={item.droppedBy} onChange={v => update(item.id, { droppedBy: v, droppedDate: v && !item.droppedDate ? new Date().toISOString().slice(0, 10) : item.droppedDate })} />
                          <Field label="Drop-off Date" type="date" value={item.droppedDate} onChange={v => update(item.id, { droppedDate: v })} />
                        </div>
                        <button onClick={() => setEditingId(null)} style={{
                          background: styles.yellow, color: styles.bg, border: 'none',
                          padding: '6px 12px', marginTop: 6, fontFamily: 'Oswald, sans-serif',
                          fontSize: 10, letterSpacing: 1.5, cursor: 'pointer', fontWeight: 700
                        }}>DONE</button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => togglePickup(item)}
                      title={item.pickedUp ? 'Mark on site' : 'Mark picked up'}
                      style={{
                        width: 28, height: 28, background: 'transparent',
                        border: `1.5px solid ${styles.borderLight}`,
                        color: item.pickedUp ? styles.green : styles.textDim,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                      {item.pickedUp ? '↩' : '↑'}
                    </button>
                    <button
                      onClick={() => setEditingId(isEditing ? null : item.id)}
                      title="Edit"
                      style={{
                        width: 28, height: 28, background: isEditing ? styles.yellow : 'transparent',
                        border: `1.5px solid ${isEditing ? styles.yellow : styles.borderLight}`,
                        color: isEditing ? styles.bg : styles.textDim,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => remove(item.id)} title="Delete" style={{
                      width: 28, height: 28, background: 'transparent',
                      border: `1.5px solid ${styles.borderLight}`,
                      color: styles.textFaint,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============ PHOTOS LIST ============
function PhotosList({ items, onChange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ url: '', caption: '', date: new Date().toISOString().slice(0, 10) });

  const add = () => {
    if (!draft.url.trim()) return;
    onChange([{ id: `p_${Date.now()}`, ...draft }, ...items]);
    setDraft({ url: '', caption: '', date: new Date().toISOString().slice(0, 10) });
    setAdding(false);
  };
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  return (
    <>
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14, marginBottom: 16, fontSize: 11, color: styles.textDim }}>
        📷 Phase 1 uses image links (paste from cloud storage). Phase 2 will add direct camera upload.
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', marginBottom: 16, fontWeight: 700
        }}>+ ADD PHOTO LINK</button>
      ) : (
        <div style={{ background: styles.surface, border: `1px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
          <Field label="Image URL" value={draft.url} onChange={v => setDraft({ ...draft, url: v })} placeholder="https://..." />
          <Field label="Caption" value={draft.caption} onChange={v => setDraft({ ...draft, caption: v })} />
          <Field label="Date" type="date" value={draft.date} onChange={v => setDraft({ ...draft, date: v })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={{ background: styles.yellow, color: styles.bg, border: 'none', padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>SAVE</button>
            <button onClick={() => setAdding(false)} style={{ background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`, padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <ImageIcon size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No photos yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {items.map(p => (
            <div key={p.id} style={{ background: styles.surface, border: `1px solid ${styles.border}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ aspectRatio: '4/3', background: styles.bg, overflow: 'hidden' }}>
                <img src={p.url} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12 }}>{p.caption || 'Untitled'}</div>
                <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>{p.date}</div>
              </div>
              <button onClick={() => remove(p.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', color: styles.text, cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============ MATERIALS LIST (Order-based with line items) ============
// Data model: orders = [{ id, supplier, supplierEmail, poNumber, orderDate, expectedDate, notes, status, items: [{ id, description, qty, unit, received }] }]
function MaterialsList({ items: orders, onChange, jobName, jobNumber }) {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [emailOrderId, setEmailOrderId] = useState(null);
  const [filter, setFilter] = useState('open');

  const addOrder = (orderData) => {
    const newOrder = {
      id: `o_${Date.now()}`,
      supplier: orderData.supplier || '',
      supplierEmail: orderData.supplierEmail || '',
      poNumber: orderData.poNumber || '',
      orderDate: orderData.orderDate || new Date().toISOString().slice(0, 10),
      expectedDate: orderData.expectedDate || '',
      notes: orderData.notes || '',
      items: orderData.items || [],
      createdAt: Date.now()
    };
    onChange([newOrder, ...orders], `Order created for ${newOrder.supplier || 'supplier'}`);
    setShowNewOrder(false);
  };

  const updateOrder = (id, changes, msg) => {
    onChange(orders.map(o => o.id === id ? { ...o, ...changes } : o), msg);
  };

  const removeOrder = (order) => {
    if (!confirm(`Delete order to ${order.supplier || 'supplier'}?`)) return;
    onChange(orders.filter(o => o.id !== order.id), `Order deleted: ${order.supplier}`);
  };

  // Order status calc based on items
  const getOrderStatus = (order) => {
    const total = (order.items || []).length;
    if (total === 0) return { label: 'EMPTY', color: styles.textFaint, pct: 0 };
    const received = (order.items || []).filter(i => i.received).length;
    if (received === 0) {
      // Check timing
      if (!order.expectedDate) return { label: 'PENDING', color: styles.steel, pct: 0 };
      const today = new Date(); today.setHours(0,0,0,0);
      const exp = new Date(order.expectedDate);
      const days = Math.round((exp - today) / 86400000);
      if (days < 0) return { label: `OVERDUE ${Math.abs(days)}D`, color: styles.red, pct: 0 };
      if (days === 0) return { label: 'ARRIVES TODAY', color: styles.orange, pct: 0 };
      if (days <= 2) return { label: `${days}D LEFT`, color: styles.orange, pct: 0 };
      if (days <= 7) return { label: `${days}D LEFT`, color: styles.yellow, pct: 0 };
      return { label: `${days}D LEFT`, color: styles.steel, pct: 0 };
    }
    if (received === total) return { label: 'COMPLETE', color: styles.green, pct: 100 };
    return { label: `${received}/${total} REC'D`, color: styles.yellow, pct: (received/total)*100 };
  };

  const filtered = orders.filter(o => {
    const s = getOrderStatus(o);
    if (filter === 'open') return s.label !== 'COMPLETE';
    if (filter === 'complete') return s.label === 'COMPLETE';
    return true;
  });

  const counts = {
    open: orders.filter(o => getOrderStatus(o).label !== 'COMPLETE').length,
    complete: orders.filter(o => getOrderStatus(o).label === 'COMPLETE').length,
    all: orders.length
  };

  const emailingOrder = orders.find(o => o.id === emailOrderId);

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}` }}>
        {[
          { id: 'open', label: 'Open' },
          { id: 'complete', label: 'Complete' },
          { id: 'all', label: 'All' }
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'none', border: 'none',
              color: active ? styles.yellow : styles.textDim,
              padding: '10px 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? styles.yellow : 'transparent'}`,
              fontWeight: 600
            }}>
              {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.6 }}>({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      {/* New order button */}
      {!showNewOrder ? (
        <button onClick={() => setShowNewOrder(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700, marginBottom: 16
        }}>+ NEW ORDER</button>
      ) : (
        <OrderEditor
          onSave={addOrder}
          onCancel={() => setShowNewOrder(false)}
          isNew={true}
        />
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <Package size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No {filter === 'all' ? '' : filter} orders</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(order => {
            const status = getOrderStatus(order);
            const isEditing = editingId === order.id;
            if (isEditing) {
              return (
                <OrderEditor
                  key={order.id}
                  order={order}
                  onSave={(data) => { updateOrder(order.id, data, `Order updated: ${data.supplier}`); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                  isNew={false}
                />
              );
            }
            return (
              <OrderCard
                key={order.id}
                order={order}
                status={status}
                onEdit={() => setEditingId(order.id)}
                onDelete={() => removeOrder(order)}
                onEmail={() => setEmailOrderId(order.id)}
                onToggleItem={(itemId) => {
                  const updatedItems = order.items.map(i => i.id === itemId ? { ...i, received: !i.received, receivedAt: !i.received ? Date.now() : null } : i);
                  const item = order.items.find(i => i.id === itemId);
                  updateOrder(order.id, { items: updatedItems }, `${item.received ? 'Marked unreceived' : 'Received'}: ${item.description}`);
                }}
              />
            );
          })}
        </div>
      )}

      {emailingOrder && (
        <OrderEmailModal
          order={emailingOrder}
          jobName={jobName}
          jobNumber={jobNumber}
          onClose={() => setEmailOrderId(null)}
          onSent={() => {
            updateOrder(emailingOrder.id, { lastSentAt: Date.now() }, `Order emailed to ${emailingOrder.supplier}`);
            setEmailOrderId(null);
          }}
        />
      )}
    </>
  );
}

// ============ ORDER CARD (collapsed view of an order) ============
function OrderCard({ order, status, onEdit, onDelete, onEmail, onToggleItem }) {
  const [expanded, setExpanded] = useState(true);
  const itemCount = (order.items || []).length;
  const receivedCount = (order.items || []).filter(i => i.received).length;

  return (
    <div style={{
      background: styles.surface, border: `1px solid ${styles.border}`,
      borderLeft: `4px solid ${status.color}`
    }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: expanded ? `1px solid ${styles.border}` : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={16} color={styles.textDim} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>
                {order.supplier || 'Unnamed Supplier'}
              </div>
            </div>
            <div style={{ fontSize: 10, color: styles.textDim, marginTop: 4, marginLeft: 24, display: 'flex', gap: 12, flexWrap: 'wrap', letterSpacing: 0.5 }}>
              <span>{itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'}</span>
              {order.poNumber && <span>PO #{order.poNumber}</span>}
              {order.orderDate && <span>Ordered {order.orderDate}</span>}
              {order.expectedDate && <span>Exp {order.expectedDate}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: status.color,
              letterSpacing: 1, padding: '4px 8px',
              border: `1px solid ${status.color}`,
              whiteSpace: 'nowrap'
            }}>{status.label}</div>
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: 12 }}>
          {/* Items list */}
          {itemCount === 0 ? (
            <div style={{ fontSize: 11, color: styles.textFaint, fontStyle: 'italic', padding: 8 }}>No items in this order yet — tap edit to add</div>
          ) : (
            <div style={{ display: 'grid', gap: 4 }}>
              {order.items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px',
                  background: item.received ? styles.bg : 'transparent',
                  borderLeft: `2px solid ${item.received ? styles.green : styles.borderLight}`
                }}>
                  <button
                    onClick={() => onToggleItem(item.id)}
                    style={{
                      width: 18, height: 18, flexShrink: 0,
                      background: item.received ? styles.green : 'transparent',
                      border: `1.5px solid ${item.received ? styles.green : styles.borderLight}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    {item.received && <Check size={11} color={styles.bg} strokeWidth={3} />}
                  </button>
                  <div style={{ flex: 1, fontSize: 13, opacity: item.received ? 0.55 : 1, textDecoration: item.received ? 'line-through' : 'none' }}>
                    <span style={{ color: styles.yellow, fontWeight: 600, marginRight: 6 }}>
                      {item.qty || ''}{item.unit ? ` ${item.unit}` : ''}
                    </span>
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {order.notes && (
            <div style={{ fontSize: 11, color: styles.textDim, marginTop: 10, padding: 8, background: styles.bg, fontStyle: 'italic', borderLeft: `2px solid ${styles.borderLight}` }}>
              "{order.notes}"
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, borderTop: `1px solid ${styles.border}`, paddingTop: 10 }}>
            <button onClick={onEmail} style={{
              background: styles.steel, color: styles.bg, border: 'none',
              padding: '6px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Mail size={12} /> EMAIL ORDER
            </button>
            <button onClick={onEdit} style={{
              background: 'none', color: styles.text, border: `1px solid ${styles.border}`,
              padding: '6px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 10, letterSpacing: 1.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Edit3 size={12} /> EDIT
            </button>
            <button onClick={onDelete} style={{
              background: 'none', color: styles.textFaint, border: `1px solid ${styles.border}`,
              padding: '6px 10px', cursor: 'pointer',
              marginLeft: 'auto'
            }}>
              <Trash2 size={12} />
            </button>
          </div>

          {order.lastSentAt && (
            <div style={{ fontSize: 9, color: styles.textFaint, marginTop: 8, letterSpacing: 0.5 }}>
              ✓ Last emailed {new Date(order.lastSentAt).toLocaleString('en-CA')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ ORDER EDITOR (create or edit an order) ============
function OrderEditor({ order, onSave, onCancel, isNew }) {
  const [draft, setDraft] = useState(() => ({
    supplier: order?.supplier || '',
    supplierEmail: order?.supplierEmail || '',
    poNumber: order?.poNumber || '',
    orderDate: order?.orderDate || new Date().toISOString().slice(0, 10),
    expectedDate: order?.expectedDate || '',
    notes: order?.notes || '',
    items: order?.items?.length ? [...order.items] : [{ id: `i_${Date.now()}`, description: '', qty: '', unit: '', received: false }]
  }));

  const updateField = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const updateItem = (id, k, v) => {
    setDraft(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [k]: v } : i) }));
  };
  const addItem = () => {
    setDraft(prev => ({ ...prev, items: [...prev.items, { id: `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, description: '', qty: '', unit: '', received: false }] }));
  };
  const removeItem = (id) => {
    setDraft(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const validItems = draft.items.filter(i => i.description.trim());
  const canSave = draft.supplier.trim() && validItems.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...draft,
      items: validItems
    });
  };

  return (
    <div style={{ background: styles.surface, border: `2px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, marginBottom: 12, color: styles.yellow }}>
        {isNew ? 'NEW ORDER' : 'EDIT ORDER'}
      </div>

      {/* Supplier section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <Field label="Supplier *" value={draft.supplier} onChange={v => updateField('supplier', v)} placeholder="Andrew Sheret, Wolseley..." />
        <Field label="Supplier Email" value={draft.supplierEmail} onChange={v => updateField('supplierEmail', v)} placeholder="orders@..." />
        <Field label="PO #" value={draft.poNumber} onChange={v => updateField('poNumber', v)} placeholder="Optional" />
        <Field label="Order Date" type="date" value={draft.orderDate} onChange={v => updateField('orderDate', v)} />
        <Field label="Expected Delivery" type="date" value={draft.expectedDate} onChange={v => updateField('expectedDate', v)} />
      </div>

      {/* Items list */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>ITEMS *</span>
          <span style={{ color: styles.textFaint }}>{validItems.length} valid / {draft.items.length} total</span>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {draft.items.map((item, idx) => (
            <div key={item.id} style={{
              background: styles.bg, border: `1px solid ${styles.border}`, padding: 8,
              display: 'grid', gridTemplateColumns: '24px 1fr 70px 70px 24px', gap: 6, alignItems: 'center'
            }}>
              <div style={{ color: styles.yellow, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>•</div>
              <input
                value={item.description}
                onChange={e => updateItem(item.id, 'description', e.target.value)}
                placeholder='3/4" Type L copper'
                style={{
                  padding: 8, background: styles.surface,
                  border: `1px solid ${styles.borderLight}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                }}
              />
              <input
                value={item.qty}
                onChange={e => updateItem(item.id, 'qty', e.target.value)}
                placeholder="Qty"
                style={{
                  padding: 8, background: styles.surface,
                  border: `1px solid ${styles.borderLight}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none', textAlign: 'center'
                }}
              />
              <input
                value={item.unit}
                onChange={e => updateItem(item.id, 'unit', e.target.value)}
                placeholder="Unit"
                style={{
                  padding: 8, background: styles.surface,
                  border: `1px solid ${styles.borderLight}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none', textAlign: 'center'
                }}
              />
              <button onClick={() => removeItem(item.id)} disabled={draft.items.length === 1} style={{
                background: 'none', border: 'none',
                color: draft.items.length === 1 ? styles.textFaint : styles.red,
                cursor: draft.items.length === 1 ? 'not-allowed' : 'pointer',
                padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} style={{
          background: 'none', color: styles.yellow, border: `1px dashed ${styles.yellow}`,
          padding: '8px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: 'pointer', marginTop: 8, width: '100%', fontWeight: 600
        }}>
          + ADD ANOTHER ITEM
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginTop: 12 }}>
        <Field label="Notes for Supplier" value={draft.notes} onChange={v => updateField('notes', v)} multiline placeholder="Delivery instructions, specs to clarify, etc." />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: 'pointer'
        }}>CANCEL</button>
        <button onClick={handleSave} disabled={!canSave} style={{
          background: canSave ? styles.yellow : styles.surfaceLight,
          color: canSave ? styles.bg : styles.textFaint,
          border: 'none', padding: '10px 16px',
          fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: canSave ? 'pointer' : 'not-allowed', fontWeight: 700
        }}>{isNew ? 'CREATE ORDER' : 'SAVE CHANGES'}</button>
      </div>
    </div>
  );
}

// ============ ORDER EMAIL MODAL ============
function OrderEmailModal({ order, jobName, jobNumber, onClose, onSent }) {
  const [emailTo, setEmailTo] = useState(order.supplierEmail || '');
  const [copiedKey, setCopiedKey] = useState(null);

  const subject = `Material Order — ${jobName || 'PMC Job'}${jobNumber ? ` (#${jobNumber})` : ''}${order.poNumber ? ` — PO #${order.poNumber}` : ''}`;

  const lines = (order.items || []).map(i => {
    const qty = i.qty ? `${i.qty}${i.unit ? ' ' + i.unit : ''} — ` : '';
    return `• ${qty}${i.description}`;
  }).join('\n');

  const body = `Hi ${order.supplier || 'there'},

Please supply the following for ${jobName || 'our project'}${jobNumber ? ` (Job #${jobNumber})` : ''}:

${lines}
${order.expectedDate ? `\nRequired on site by: ${order.expectedDate}` : ''}${order.poNumber ? `\nPO #: ${order.poNumber}` : ''}${order.notes ? `\n\nNotes: ${order.notes}` : ''}

Please confirm pricing and availability.

Thanks,
Prestige Mechanical Contracting`;

  const fullText = `Subject: ${subject}\n\n${body}`;

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const sendMailto = () => {
    const url = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    if (onSent) onSent();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20
    }}>
      <div style={{ background: styles.surface, border: `2px solid ${styles.steel}`, maxWidth: 640, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: styles.steel, height: 4 }} />
        <div style={{ padding: 16, borderBottom: `1px solid ${styles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, letterSpacing: 1.5 }}>EMAIL ORDER</div>
            <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              TO {order.supplier?.toUpperCase() || 'SUPPLIER'} · {(order.items || []).length} ITEMS
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: styles.text, cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          <Field label="To (Supplier Email)" value={emailTo} onChange={setEmailTo} placeholder="orders@supplier.com" />

          <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginTop: 12, marginBottom: 4 }}>SUBJECT</div>
          <div style={{ background: styles.bg, border: `1px solid ${styles.border}`, padding: 10, fontSize: 13, marginBottom: 12 }}>
            {subject}
          </div>

          <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>MESSAGE</div>
          <div style={{
            background: styles.bg, border: `1px solid ${styles.border}`,
            padding: 12, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            fontFamily: 'JetBrains Mono, monospace', maxHeight: 320, overflowY: 'auto'
          }}>
            {body}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${styles.border}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => copyToClipboard(fullText, 'all')} style={{
            background: copiedKey === 'all' ? styles.green : styles.surfaceLight,
            color: copiedKey === 'all' ? styles.bg : styles.text,
            border: `1px solid ${copiedKey === 'all' ? styles.green : styles.border}`,
            padding: '10px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
          }}>
            {copiedKey === 'all' ? <><Check size={14} /> COPIED</> : 'COPY ALL'}
          </button>
          <button onClick={() => copyToClipboard(body, 'body')} style={{
            background: copiedKey === 'body' ? styles.green : styles.surfaceLight,
            color: copiedKey === 'body' ? styles.bg : styles.text,
            border: `1px solid ${copiedKey === 'body' ? styles.green : styles.border}`,
            padding: '10px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
            cursor: 'pointer', fontWeight: 600
          }}>
            {copiedKey === 'body' ? '✓' : 'COPY BODY'}
          </button>
          <button onClick={sendMailto} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '10px 14px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
            cursor: 'pointer', fontWeight: 700, marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Mail size={14} /> OPEN IN MAIL
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ PROGRESS VIEW ============
// New model: progress[categoryId] = { material: 0-100, labour: 0-100 }
// enabledCategories: array of category IDs that apply to this job
// Migration: if progress[cat] is a number (old format), convert to { material: n, labour: n }
function ProgressView({ progress, enabledCategories, onChange, onChangeEnabled }) {
  const [openCode, setOpenCode] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);

  // Normalize progress data — handles old single-number format
  const normalize = (v) => {
    if (typeof v === 'number') return { material: v, labour: v };
    if (v && typeof v === 'object') {
      return { material: typeof v.material === 'number' ? v.material : 0, labour: typeof v.labour === 'number' ? v.labour : 0 };
    }
    return { material: 0, labour: 0 };
  };

  const enabled = (enabledCategories && enabledCategories.length > 0)
    ? PROGRESS_CATEGORIES.filter(c => enabledCategories.includes(c.id))
    : PROGRESS_CATEGORIES; // legacy jobs without enabledCategories show all

  const update = (id, kind, val) => {
    const current = normalize(progress[id]);
    const next = { ...current, [kind]: val };
    const cat = PROGRESS_CATEGORIES.find(c => c.id === id);
    onChange({ ...progress, [id]: next }, `${cat?.label || id} ${kind} → ${val}%`);
  };

  const toggleCategory = (id) => {
    const set = new Set(enabledCategories || PROGRESS_CATEGORIES.map(c => c.id));
    if (set.has(id)) set.delete(id); else set.add(id);
    const cat = PROGRESS_CATEGORIES.find(c => c.id === id);
    onChangeEnabled(Array.from(set), set.has(id) ? `${cat?.label} added to job` : `${cat?.label} removed from job`);
  };

  // Calculate overall material and labour as averages across enabled categories
  const overallMaterial = enabled.length === 0 ? 0 : Math.round(
    enabled.reduce((sum, c) => sum + normalize(progress[c.id]).material, 0) / enabled.length
  );
  const overallLabour = enabled.length === 0 ? 0 : Math.round(
    enabled.reduce((sum, c) => sum + normalize(progress[c.id]).labour, 0) / enabled.length
  );

  return (
    <>
      {/* Overall progress card with TWO bars */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.yellow}`, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11, color: styles.yellow, letterSpacing: 2, fontWeight: 700 }}>OVERALL PROGRESS</div>
          <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1 }}>
            {enabled.length} OF {PROGRESS_CATEGORIES.length} CATEGORIES ACTIVE
          </div>
        </div>

        <OverallBar label="MATERIAL" value={overallMaterial} color={styles.steel} />
        <OverallBar label="LABOUR" value={overallLabour} color={styles.yellow} />
      </div>

      {/* Manage categories button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1.5 }}>
          {enabled.length} ACTIVE · TAP CATEGORY TO ADJUST
        </div>
        <button onClick={() => setManagingCategories(!managingCategories)} style={{
          background: managingCategories ? styles.yellow : styles.surfaceLight,
          color: managingCategories ? styles.bg : styles.text,
          border: `1px solid ${managingCategories ? styles.yellow : styles.border}`,
          padding: '8px 14px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
        }}>
          {managingCategories ? <><Check size={12} /> DONE</> : <><Edit3 size={12} /> MANAGE CATEGORIES</>}
        </button>
      </div>

      {/* Manage categories panel */}
      {managingCategories && (
        <div style={{ background: styles.surface, border: `2px solid ${styles.yellow}`, padding: 14, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1.5, color: styles.yellow, marginBottom: 6 }}>
            ▸ CATEGORIES FOR THIS JOB
          </div>
          <div style={{ fontSize: 11, color: styles.textDim, marginBottom: 12, lineHeight: 1.4 }}>
            Toggle off any categories that don't apply to this job (e.g. no AC, no demolition). Best done before work starts. You can change anytime — progress data is preserved if you re-enable.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {PROGRESS_CATEGORIES.map(cat => {
              const isEnabled = (enabledCategories || PROGRESS_CATEGORIES.map(c => c.id)).includes(cat.id);
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)} style={{
                  background: isEnabled ? styles.bg : 'transparent',
                  border: `1.5px solid ${isEnabled ? styles.yellow : styles.border}`,
                  color: isEnabled ? styles.text : styles.textFaint,
                  padding: '10px 12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textAlign: 'left'
                }}>
                  <div style={{
                    width: 18, height: 18, flexShrink: 0,
                    background: isEnabled ? styles.yellow : 'transparent',
                    border: `1.5px solid ${isEnabled ? styles.yellow : styles.borderLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isEnabled && <Check size={11} color={styles.bg} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 14, color: isEnabled ? styles.yellow : styles.textFaint }}>{cat.icon}</span>
                  <span style={{ flex: 1 }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category sliders */}
      {enabled.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <BarChart3 size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No categories enabled — tap MANAGE CATEGORIES to add some</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {enabled.map(cat => {
            const vals = normalize(progress[cat.id]);
            const avg = Math.round((vals.material + vals.labour) / 2);
            const codeRef = CODE_REFERENCES[cat.id];
            return (
              <div key={cat.id} style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: styles.yellow, fontSize: 18 }}>{cat.icon}</span>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 15, letterSpacing: 1, fontWeight: 600 }}>{cat.label.toUpperCase()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      fontFamily: 'Oswald, sans-serif', fontSize: 13,
                      color: avg === 100 ? styles.green : avg > 0 ? styles.yellow : styles.textDim,
                      padding: '2px 8px', border: `1px solid ${avg === 100 ? styles.green : avg > 0 ? styles.yellow : styles.border}`,
                      letterSpacing: 1, fontWeight: 700
                    }}>AVG {avg}%</div>
                    {codeRef && (
                      <button onClick={() => setOpenCode(openCode === cat.id ? null : cat.id)} style={{
                        background: openCode === cat.id ? styles.steel : styles.surfaceLight,
                        color: openCode === cat.id ? styles.bg : styles.steel,
                        border: `1px solid ${styles.steel}`,
                        padding: '4px 8px', fontSize: 10, letterSpacing: 1, cursor: 'pointer',
                        fontFamily: 'Oswald, sans-serif', display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <BookOpen size={12} /> CODE
                      </button>
                    )}
                  </div>
                </div>

                {/* Material slider */}
                <SliderRow
                  label="MATERIAL"
                  value={vals.material}
                  color={styles.steel}
                  onChange={(v) => update(cat.id, 'material', v)}
                />

                {/* Labour slider */}
                <SliderRow
                  label="LABOUR"
                  value={vals.labour}
                  color={styles.yellow}
                  onChange={(v) => update(cat.id, 'labour', v)}
                />

                {openCode === cat.id && codeRef && (
                  <div style={{ marginTop: 12, padding: 14, background: styles.bg, border: `1px solid ${styles.steel}` }}>
                    <div style={{ fontSize: 10, color: styles.steel, letterSpacing: 1.5, marginBottom: 4 }}>{codeRef.code}</div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, marginBottom: 10 }}>{codeRef.title.toUpperCase()} REFERENCE</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {codeRef.sections.map((s, i) => (
                        <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${styles.steelDark}` }}>
                          <div style={{ fontSize: 10, color: styles.yellow, fontWeight: 600, letterSpacing: 1 }}>{s.ref}</div>
                          <div style={{ fontSize: 12, color: styles.text, marginTop: 2, lineHeight: 1.5 }}>{s.text}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: styles.textFaint, marginTop: 10, fontStyle: 'italic' }}>
                      Reference only — verify against current AHJ and project specs.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Slider row helper: label on left, number on right, slider full width
function SliderRow({ label, value, color, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: color, letterSpacing: 1.5, fontWeight: 700 }}>{label}</div>
        <div style={{
          fontFamily: 'Oswald, sans-serif', fontSize: 16, color,
          fontWeight: 700, minWidth: 44, textAlign: 'right'
        }}>{value}%</div>
      </div>
      <input
        type="range" min="0" max="100" step="5" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
      <div style={{ height: 4, background: styles.bg, marginTop: 2, position: 'relative' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: value === 100 ? styles.green : color,
          transition: 'width 0.2s'
        }} />
      </div>
    </div>
  );
}

// Overall progress bar (used in summary card)
function OverallBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{ fontSize: 11, color, letterSpacing: 2, fontWeight: 700 }}>{label}</div>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 26, color, fontWeight: 700 }}>{value}%</div>
      </div>
      <div style={{ height: 8, background: styles.bg, position: 'relative' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: value === 100 ? styles.green : color,
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  );
}

// ============ VOICE INPUT (used by other components) ============
// Uses Web Speech API (built into mobile browsers)
function VoiceButton({ onTranscript, size = 18 }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSupported(false);
      return;
    }

    // Detect iOS — Web Speech API is unreliable in iOS Safari, especially in iframes.
    // Detect iframe — most artifact contexts run in iframes which block mic permissions.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();

    if (isIOS || inIframe) {
      // Hide button — voice will work in Phase 2 PWA but not here
      setSupported(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-CA';
      rec.onresult = (e) => {
        const text = Array.from(e.results).map(r => r[0].transcript).join(' ');
        onTranscript(text);
        setListening(false);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      setSupported(true);
    } catch (e) {
      setSupported(false);
    }
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (e) {
        // Already started
      }
    }
  };

  if (!supported) return null;

  return (
    <button onClick={toggle} type="button" title={listening ? 'Stop recording' : 'Voice dictate'} style={{
      background: listening ? styles.red : 'transparent',
      border: `1px solid ${listening ? styles.red : styles.border}`,
      color: listening ? styles.bg : styles.steel,
      padding: 8, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: listening ? 'voicePulse 0.8s infinite' : 'none'
    }}>
      <style>{`@keyframes voicePulse { 0%, 100% { box-shadow: 0 0 0 0 ${styles.red}55; } 50% { box-shadow: 0 0 0 6px ${styles.red}00; } }`}</style>
      {listening ? <MicOff size={size} /> : <Mic size={size} />}
    </button>
  );
}

// Wrapper for input + voice button
function VoiceInput({ value, onChange, placeholder, multiline, label }) {
  const handleVoice = (text) => {
    const newVal = value ? `${value} ${text}` : text;
    onChange(newVal);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        {multiline ? (
          <textarea
            value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
            style={{
              flex: 1, padding: 10, background: styles.bg,
              border: `1px solid ${styles.border}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, resize: 'vertical', outline: 'none'
            }}
          />
        ) : (
          <input
            value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{
              flex: 1, padding: 10, background: styles.bg,
              border: `1px solid ${styles.border}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
        )}
        <VoiceButton onTranscript={handleVoice} />
      </div>
    </div>
  );
}

// ============ TODAY VIEW (HOME) ============
function TodayView({ jobs, onOpenJob, onOpenFolder, onNewJob, bulletinPosts = [], scheduleEvents = [], onOpenBulletin, onOpenSchedule }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const today = new Date(todayStr);
  const weekFromNow = new Date(today.getTime() + 7 * 86400000);

  // Aggregate across all jobs
  const overdueTasks = [];
  const todayTasks = [];
  const weekTasks = [];
  const expectedToday = [];
  const overdueDeliveries = [];
  const openActionRfis = [];
  const recentActivity = [];

  jobs.forEach(job => {
    // Helper: collect both top-level tasks and subtasks from checklist folders
    const allTaskItems = [];
    (job.tasks || []).forEach(it => {
      if (it.kind === 'folder') {
        (it.items || []).forEach(s => {
          allTaskItems.push({
            id: s.id, text: s.text, dueDate: s.dueDate, done: s.done, assignee: s.assignee,
            inChecklist: it.name
          });
        });
      } else {
        // top-level task (kind 'task' or legacy without kind)
        allTaskItems.push({
          id: it.id, text: it.text, dueDate: it.dueDate, done: it.done, assignee: it.assignee
        });
      }
    });
    allTaskItems.forEach(t => {
      if (t.done) return;
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const enriched = { ...t, jobId: job.id, jobName: job.jobName, jobNumber: job.jobNumber };
      if (d < today) overdueTasks.push(enriched);
      else if (t.dueDate === todayStr) todayTasks.push(enriched);
      else if (d <= weekFromNow) weekTasks.push(enriched);
    });
    (job.materialOrders || []).forEach(order => {
      // Check if order is fully received
      const items = order.items || [];
      if (items.length === 0) return;
      const allReceived = items.every(i => i.received);
      if (allReceived) return;
      if (!order.expectedDate) return;
      const d = new Date(order.expectedDate);
      const itemCount = items.length;
      const receivedCount = items.filter(i => i.received).length;
      const summary = {
        id: order.id,
        supplier: order.supplier || 'Supplier',
        item: itemCount === 1 ? items[0].description : `${itemCount} items (${receivedCount}/${itemCount} received)`,
        qty: itemCount === 1 ? items[0].qty : '',
        unit: itemCount === 1 ? items[0].unit : '',
        jobId: job.id,
        jobName: job.jobName
      };
      if (order.expectedDate === todayStr) expectedToday.push(summary);
      else if (d < today) overdueDeliveries.push(summary);
    });
    (job.rfis || []).forEach(r => {
      if (r.status === 'action') openActionRfis.push({ ...r, jobId: job.id, jobName: job.jobName });
    });
    (job.activity || []).slice(0, 3).forEach(a => {
      recentActivity.push({ ...a, jobName: job.jobName, jobId: job.id });
    });
  });

  recentActivity.sort((a, b) => b.at - a.at);
  const topActivity = recentActivity.slice(0, 8);

  // Pinned/active bulletin posts
  const pinnedPosts = (bulletinPosts || []).filter(p => p.pinned && !p.archived).slice(0, 3);
  const recentPosts = (bulletinPosts || [])
    .filter(p => !p.archived && !p.pinned)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 2);

  // Upcoming events (next 14 days)
  const twoWeeksOut = new Date(today.getTime() + 14 * 86400000);
  const upcomingEvents = (scheduleEvents || [])
    .filter(e => {
      if (!e.startDate) return false;
      const d = new Date(e.startDate);
      return d >= today && d <= twoWeeksOut;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const dateLabel = now.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  const Section = ({ title, count, color, children, emptyText }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 4, height: 18, background: color }} />
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1 }}>({count})</div>
      </div>
      {count === 0 ? (
        <div style={{ padding: 14, background: styles.surface, border: `1px solid ${styles.border}`, fontSize: 12, color: styles.textFaint, fontStyle: 'italic' }}>
          {emptyText || 'Nothing here'}
        </div>
      ) : children}
    </div>
  );

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>
          {greeting.toUpperCase()}, MATT
        </div>
        <div style={{ fontSize: 12, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
          {dateLabel.toUpperCase()}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <StatBlock value={jobs.length} label="ACTIVE JOBS" color={styles.yellow} />
        <StatBlock value={overdueTasks.length} label="OVERDUE" color={overdueTasks.length ? styles.red : styles.textDim} />
        <StatBlock value={todayTasks.length} label="DUE TODAY" color={todayTasks.length ? styles.orange : styles.textDim} />
        <StatBlock value={openActionRfis.length} label="RFI ACTION" color={openActionRfis.length ? styles.orange : styles.textDim} />
      </div>

      {/* Pinned bulletin posts (always visible) */}
      {pinnedPosts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {pinnedPosts.map(p => (
            <div key={p.id} onClick={onOpenBulletin} style={{
              background: styles.surface, border: `1px solid ${styles.yellow}`,
              borderLeft: `4px solid ${styles.yellow}`,
              padding: 12, marginBottom: 6, cursor: 'pointer',
              display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              <div style={{
                background: styles.yellow, color: styles.bg,
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0
              }}>📌</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{p.title}</div>
                {p.body && <div style={{ fontSize: 12, color: styles.textDim, marginTop: 4, lineHeight: 1.4 }}>{p.body.slice(0, 140)}{p.body.length > 140 && '…'}</div>}
                <div style={{ fontSize: 9, color: styles.textFaint, marginTop: 4, letterSpacing: 0.5 }}>
                  PINNED · {relTime(p.at)} {p.author && `· ${p.author}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{
          border: `2px dashed ${styles.border}`, padding: 40, textAlign: 'center',
          background: styles.surface, marginTop: 24
        }}>
          <HardHat size={40} color={styles.yellowDim} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, letterSpacing: 1.5, color: styles.textDim, marginBottom: 12 }}>NO JOBS YET</div>
          <button onClick={onNewJob} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '12px 20px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
            fontSize: 13, letterSpacing: 1.5, cursor: 'pointer'
          }}>+ CREATE FIRST JOB</button>
        </div>
      ) : (
        <>
          {/* Upcoming events (next 2 weeks) */}
          {upcomingEvents.length > 0 && (
            <Section title="UPCOMING" count={upcomingEvents.length} color={styles.steel}>
              <div style={{ display: 'grid', gap: 6 }}>
                {upcomingEvents.map(e => {
                  const d = new Date(e.startDate);
                  const days = Math.round((d - today) / 86400000);
                  const dayLabel = days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `${days}D`;
                  const eventColors = { holiday: styles.green, vacation: styles.steel, event: styles.yellow, dayoff: styles.orange };
                  const color = eventColors[e.type] || styles.steel;
                  return (
                    <div key={e.id} onClick={onOpenSchedule} style={{
                      background: styles.surface, border: `1px solid ${styles.border}`,
                      borderLeft: `4px solid ${color}`, padding: 10, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                        <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2, display: 'flex', gap: 10 }}>
                          <span>📅 {e.startDate}{e.endDate && e.endDate !== e.startDate && ` → ${e.endDate}`}</span>
                          {e.who && <span>👤 {e.who}</span>}
                          {e.type && <span style={{ color: color, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{e.type}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: color, letterSpacing: 1, fontWeight: 700 }}>{dayLabel}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Recent (non-pinned) bulletin posts */}
          {recentPosts.length > 0 && (
            <Section title="LATEST FROM BULLETIN" count={recentPosts.length} color={styles.yellow}>
              <div style={{ display: 'grid', gap: 6 }}>
                {recentPosts.map(p => (
                  <div key={p.id} onClick={onOpenBulletin} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    borderLeft: `4px solid ${styles.yellow}`,
                    padding: 10, cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                    {p.body && <div style={{ fontSize: 11, color: styles.textDim, marginTop: 3 }}>{p.body.slice(0, 120)}{p.body.length > 120 && '…'}</div>}
                    <div style={{ fontSize: 9, color: styles.textFaint, marginTop: 4, letterSpacing: 0.5 }}>
                      {relTime(p.at)} {p.author && `· ${p.author}`}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Overdue tasks */}
          <Section title="OVERDUE TASKS" count={overdueTasks.length} color={styles.red} emptyText="Nothing overdue — nice work">
            <div style={{ display: 'grid', gap: 6 }}>
              {overdueTasks.map(t => (
                <TaskRow key={t.id} task={t} urgency="overdue" onClick={() => onOpenFolder(t.jobId, 'tasks')} />
              ))}
            </div>
          </Section>

          {/* Today tasks */}
          <Section title="DUE TODAY" count={todayTasks.length} color={styles.orange} emptyText="No tasks due today">
            <div style={{ display: 'grid', gap: 6 }}>
              {todayTasks.map(t => (
                <TaskRow key={t.id} task={t} urgency="today" onClick={() => onOpenFolder(t.jobId, 'tasks')} />
              ))}
            </div>
          </Section>

          {/* Deliveries */}
          {(expectedToday.length > 0 || overdueDeliveries.length > 0) && (
            <Section title="DELIVERIES TO WATCH" count={expectedToday.length + overdueDeliveries.length} color={styles.yellow}>
              <div style={{ display: 'grid', gap: 6 }}>
                {overdueDeliveries.map(m => (
                  <div key={m.id} onClick={() => onOpenFolder(m.jobId, 'materials')} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    borderLeft: `4px solid ${styles.red}`, padding: 10, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {m.qty && <span style={{ color: styles.yellow, marginRight: 6 }}>{m.qty}{m.unit && ` ${m.unit}`}</span>}
                        {m.item}
                      </div>
                      <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>
                        {m.supplier && `${m.supplier} · `}{m.jobName}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: styles.red, letterSpacing: 1, fontWeight: 700 }}>OVERDUE</div>
                  </div>
                ))}
                {expectedToday.map(m => (
                  <div key={m.id} onClick={() => onOpenFolder(m.jobId, 'materials')} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    borderLeft: `4px solid ${styles.orange}`, padding: 10, cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {m.qty && <span style={{ color: styles.yellow, marginRight: 6 }}>{m.qty}{m.unit && ` ${m.unit}`}</span>}
                        {m.item}
                      </div>
                      <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>
                        {m.supplier && `${m.supplier} · `}{m.jobName}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: styles.orange, letterSpacing: 1, fontWeight: 700 }}>TODAY</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* This week */}
          <Section title="DUE THIS WEEK" count={weekTasks.length} color={styles.yellow} emptyText="Nothing this week">
            <div style={{ display: 'grid', gap: 6 }}>
              {weekTasks.slice(0, 5).map(t => (
                <TaskRow key={t.id} task={t} urgency="week" onClick={() => onOpenFolder(t.jobId, 'tasks')} />
              ))}
              {weekTasks.length > 5 && (
                <div style={{ fontSize: 11, color: styles.textDim, padding: 6, textAlign: 'center' }}>
                  + {weekTasks.length - 5} more this week
                </div>
              )}
            </div>
          </Section>

          {/* RFI Action */}
          {openActionRfis.length > 0 && (
            <Section title="RFIs NEEDING ACTION" count={openActionRfis.length} color={styles.orange}>
              <div style={{ display: 'grid', gap: 6 }}>
                {openActionRfis.slice(0, 5).map(r => (
                  <div key={r.id} onClick={() => onOpenFolder(r.jobId, 'rfis')} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    borderLeft: `4px solid ${styles.orange}`, padding: 10, cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 10, color: styles.yellow, fontWeight: 700, letterSpacing: 1 }}>RFI #{r.number || '—'}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.subject}</span>
                    </div>
                    <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>{r.jobName}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Active jobs quick access */}
          <Section title="JOBS" count={jobs.length} color={styles.steel}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {jobs.slice(0, 6).map(j => {
                const { overall: progressAvg } = computeJobProgress(j);
                return (
                  <div key={j.id} onClick={() => onOpenJob(j.id)} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    padding: 12, cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: 9, color: styles.yellow, letterSpacing: 1.5, fontWeight: 600 }}>#{j.jobNumber || '—'}</div>
                    <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 600, marginTop: 2, lineHeight: 1.2 }}>{j.jobName}</div>
                    <div style={{ height: 3, background: styles.bg, marginTop: 8 }}>
                      <div style={{ height: '100%', width: `${progressAvg}%`, background: styles.yellow }} />
                    </div>
                    <div style={{ fontSize: 9, color: styles.textDim, marginTop: 4, letterSpacing: 1 }}>{progressAvg}% COMPLETE</div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Recent activity */}
          {topActivity.length > 0 && (
            <Section title="RECENT ACTIVITY" count={topActivity.length} color={styles.steel}>
              <div style={{ display: 'grid', gap: 4 }}>
                {topActivity.map(a => (
                  <div key={a.id} onClick={() => onOpenJob(a.jobId)} style={{
                    background: styles.surface, border: `1px solid ${styles.border}`,
                    padding: '8px 10px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', gap: 10
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12 }}>{a.text}</div>
                      <div style={{ fontSize: 9, color: styles.textDim, marginTop: 2 }}>{a.jobName}</div>
                    </div>
                    <div style={{ fontSize: 9, color: styles.textFaint, letterSpacing: 1, whiteSpace: 'nowrap' }}>{relTime(a.at)}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({ value, label, color }) {
  return (
    <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 10, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, color: color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function TaskRow({ task, urgency, onClick }) {
  const colors = { overdue: styles.red, today: styles.orange, week: styles.yellow };
  const c = colors[urgency] || styles.steel;
  return (
    <div onClick={onClick} style={{
      background: styles.surface, border: `1px solid ${styles.border}`,
      borderLeft: `4px solid ${c}`, padding: 10, cursor: 'pointer',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{task.text}</div>
        <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2 }}>
          {task.jobName} {task.assignee && `· ${task.assignee}`}
        </div>
      </div>
      <div style={{ fontSize: 10, color: c, letterSpacing: 1, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {task.dueDate}
      </div>
    </div>
  );
}

function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// ============ BOTTOM NAV ============
function BottomNav({ currentView, onNavigate, onQuickAdd }) {
  const items = [
    { id: 'today', label: 'TODAY', icon: Home },
    { id: 'jobs', label: 'JOBS', icon: Folder },
    { id: 'service', label: 'SERVICE', icon: Hammer },
    { id: 'quick', label: '', icon: Plus, special: true },
    { id: 'library', label: 'LIBRARY', icon: Library },
    { id: 'mattgpt', label: 'MATTGPT', icon: MessageSquare }
  ];
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: styles.surface, borderTop: `2px solid ${styles.yellow}`,
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom, 0)', height: 60
    }}>
      {items.map(item => {
        const Ic = item.icon;
        const active = currentView === item.id;
        if (item.special) {
          return (
            <button key={item.id} onClick={onQuickAdd} style={{
              background: styles.yellow, color: styles.bg, border: 'none',
              width: 48, height: 48, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: `0 4px 12px ${styles.yellow}55`,
              marginTop: -18, flexShrink: 0
            }}>
              <Plus size={24} strokeWidth={3} />
            </button>
          );
        }
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            background: 'none', border: 'none',
            color: active ? styles.yellow : styles.textDim,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            cursor: 'pointer', padding: '6px 6px', flex: 1,
            fontFamily: 'Oswald, sans-serif', fontSize: 8, letterSpacing: 0.8,
            fontWeight: 600, minWidth: 0
          }}>
            <Ic size={18} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ============ QUICK ADD MODAL ============
function QuickAddModal({ jobs, activeJobId, onClose, onSave }) {
  const [type, setType] = useState('task'); // task | rfi | photo | material
  const [jobId, setJobId] = useState(activeJobId || jobs[0]?.id || '');
  const [draft, setDraft] = useState({});

  const job = jobs.find(j => j.id === jobId);

  const types = [
    { id: 'task', label: 'Task', icon: ListChecks, color: styles.yellow },
    { id: 'rfi', label: 'RFI', icon: AlertCircle, color: styles.orange },
    { id: 'material', label: 'Material', icon: Package, color: styles.text },
    { id: 'photo', label: 'Photo', icon: Camera, color: styles.steel }
  ];

  const submit = () => {
    if (!job) return;
    const updates = { ...job };
    const today = new Date().toISOString().slice(0, 10);
    let activityText = '';

    if (type === 'task') {
      if (!draft.text?.trim()) return;
      const newTask = { id: `tk_${Date.now()}`, kind: 'task', text: draft.text.trim(), dueDate: draft.dueDate || '', assignee: draft.assignee || '', note: '', done: false, createdAt: Date.now() };
      updates.tasks = [newTask, ...(job.tasks || [])];
      activityText = `Task added: ${draft.text.trim()}`;
    } else if (type === 'rfi') {
      if (!draft.subject?.trim()) return;
      const newRfi = { id: `n_${Date.now()}`, number: draft.number || '', date: today, subject: draft.subject.trim(), question: draft.question || '', status: 'issued', createdAt: Date.now() };
      updates.rfis = [newRfi, ...(job.rfis || [])];
      activityText = `RFI issued: ${draft.subject.trim()}`;
    } else if (type === 'material') {
      if (!draft.item?.trim()) return;
      // Create an order with a single line item — user can add more later via Edit
      const newOrder = {
        id: `o_${Date.now()}`,
        supplier: draft.supplier || '',
        supplierEmail: '',
        poNumber: '',
        orderDate: today,
        expectedDate: draft.expectedDate || '',
        notes: '',
        items: [{
          id: `i_${Date.now()}`,
          description: draft.item.trim(),
          qty: draft.qty || '',
          unit: draft.unit || '',
          received: false
        }],
        createdAt: Date.now()
      };
      updates.materialOrders = [newOrder, ...(job.materialOrders || [])];
      activityText = `Order started for ${draft.supplier || 'supplier'}: ${draft.item.trim()}`;
    } else if (type === 'photo') {
      if (!draft.url?.trim()) return;
      const newPhoto = { id: `p_${Date.now()}`, url: draft.url.trim(), caption: draft.caption || '', date: today };
      updates.photos = [newPhoto, ...(job.photos || [])];
      activityText = `Photo added: ${draft.caption || 'Untitled'}`;
    }

    updates.activity = [{
      id: `a_${Date.now()}`, at: Date.now(), type: type, text: activityText
    }, ...(job.activity || [])];

    onSave(updates);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 200
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: styles.surface, border: `2px solid ${styles.yellow}`,
        borderBottom: 'none', width: '100%', maxWidth: 600,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: styles.yellow, height: 4 }} />
        <div style={{ padding: 16, borderBottom: `1px solid ${styles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, letterSpacing: 1.5, fontWeight: 700 }}>QUICK ADD</div>
            <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>FAST CAPTURE FROM ANYWHERE</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: styles.text, cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {/* Type picker */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 12, borderBottom: `1px solid ${styles.border}` }}>
          {types.map(t => {
            const Ic = t.icon;
            const active = type === t.id;
            return (
              <button key={t.id} onClick={() => { setType(t.id); setDraft({}); }} style={{
                background: active ? t.color : styles.bg,
                color: active ? styles.bg : t.color,
                border: `1.5px solid ${t.color}`,
                padding: '10px 6px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1, fontWeight: 600
              }}>
                <Ic size={18} />
                {t.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {/* Job selector */}
          {jobs.length > 0 ? (
            <>
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4 }}>JOB</div>
              <select value={jobId} onChange={e => setJobId(e.target.value)} style={{
                width: '100%', padding: 10, background: styles.bg,
                border: `1px solid ${styles.border}`, color: styles.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, marginBottom: 12, outline: 'none'
              }}>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>#{j.jobNumber || '?'} — {j.jobName}</option>
                ))}
              </select>

              {/* Type-specific fields */}
              {type === 'task' && (
                <>
                  <VoiceInput label="Task" value={draft.text} onChange={v => setDraft({ ...draft, text: v })} placeholder="What needs doing?" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Due Date" type="date" value={draft.dueDate} onChange={v => setDraft({ ...draft, dueDate: v })} />
                    <Field label="Assigned To" value={draft.assignee} onChange={v => setDraft({ ...draft, assignee: v })} placeholder="Foreman name" />
                  </div>
                </>
              )}
              {type === 'rfi' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                    <Field label="RFI #" value={draft.number} onChange={v => setDraft({ ...draft, number: v })} placeholder="001" />
                    <Field label="Subject" value={draft.subject} onChange={v => setDraft({ ...draft, subject: v })} />
                  </div>
                  <VoiceInput label="Question" value={draft.question} onChange={v => setDraft({ ...draft, question: v })} placeholder="Describe the issue..." multiline />
                </>
              )}
              {type === 'material' && (
                <>
                  <VoiceInput label="Item" value={draft.item} onChange={v => setDraft({ ...draft, item: v })} placeholder='3/4" Type L copper' />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 10 }}>
                    <Field label="Qty" value={draft.qty} onChange={v => setDraft({ ...draft, qty: v })} />
                    <Field label="Unit" value={draft.unit} onChange={v => setDraft({ ...draft, unit: v })} placeholder="ft, ea" />
                    <Field label="Supplier" value={draft.supplier} onChange={v => setDraft({ ...draft, supplier: v })} />
                  </div>
                  <Field label="Expected Delivery" type="date" value={draft.expectedDate} onChange={v => setDraft({ ...draft, expectedDate: v })} />
                </>
              )}
              {type === 'photo' && (
                <>
                  <Field label="Image URL" value={draft.url} onChange={v => setDraft({ ...draft, url: v })} placeholder="https://..." />
                  <VoiceInput label="Caption" value={draft.caption} onChange={v => setDraft({ ...draft, caption: v })} placeholder="What's in the photo?" />
                </>
              )}
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: styles.textDim, fontSize: 13 }}>
              Create a job first
            </div>
          )}
        </div>

        {jobs.length > 0 && (
          <div style={{ padding: 12, borderTop: `1px solid ${styles.border}`, display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
              padding: 12, fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
            }}>CANCEL</button>
            <button onClick={submit} style={{
              flex: 2, background: styles.yellow, color: styles.bg, border: 'none',
              padding: 12, fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', fontWeight: 700
            }}>SAVE</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ TASKS LIST (with subfolders + employee dropdown) ============
// Data model:
//   items = [
//     { id, kind: 'task', text, note, dueDate, assignee, done, createdAt, completedAt },
//     { id, kind: 'folder', name, expanded, items: [{ id, text, dueDate, assignee, done }] }
//   ]
// Folders = simple checkbox subtasks; main tasks = full fields with optional notes.
// Migration: any old item without `kind` is treated as a 'task'.
function TasksList({ items, onChange, employees }) {
  const [draftText, setDraftText] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftKind, setDraftKind] = useState('task'); // task | folder
  const [filter, setFilter] = useState('open');
  const [editingId, setEditingId] = useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr);
  const employeeNames = (employees || []).filter(e => e.active !== false).map(e => e.name);

  // Normalize items so legacy items get a `kind`
  const normalized = (items || []).map(it => it.kind ? it : { ...it, kind: 'task' });

  const persist = (newItems, msg) => onChange(newItems, msg);

  const add = () => {
    if (!draftText.trim()) return;
    if (draftKind === 'folder') {
      const newFolder = {
        id: `fld_${Date.now()}`,
        kind: 'folder',
        name: draftText.trim(),
        expanded: true,
        items: [],
        createdAt: Date.now()
      };
      persist([newFolder, ...normalized], `List added: ${draftText.trim()}`);
    } else {
      const newTask = {
        id: `tk_${Date.now()}`,
        kind: 'task',
        text: draftText.trim(),
        note: draftNote.trim() || '',
        dueDate: draftDate || '',
        assignee: draftAssignee || '',
        done: false,
        createdAt: Date.now()
      };
      persist([newTask, ...normalized], `Task added: ${draftText.trim()}`);
    }
    setDraftText(''); setDraftDate(''); setDraftAssignee(''); setDraftNote('');
  };

  const updateItem = (id, changes, msg) => {
    persist(normalized.map(i => i.id === id ? { ...i, ...changes } : i), msg);
  };

  const removeItem = (item) => {
    persist(normalized.filter(i => i.id !== item.id), `Removed: ${item.text || item.name}`);
  };

  const toggleTask = (task) => {
    updateItem(task.id, { done: !task.done, completedAt: !task.done ? Date.now() : null },
      task.done ? `Reopened: ${task.text}` : `Completed: ${task.text}`);
  };

  // Subtask helpers (inside folders)
  const addSubtask = (folderId, text) => {
    if (!text.trim()) return;
    const newSub = { id: `sub_${Date.now()}`, text: text.trim(), done: false, dueDate: '', assignee: '', createdAt: Date.now() };
    persist(normalized.map(i => i.id === folderId ? { ...i, items: [...(i.items || []), newSub] } : i), `Subtask added: ${text.trim()}`);
  };

  const updateSubtask = (folderId, subId, changes, msg) => {
    persist(normalized.map(i => {
      if (i.id !== folderId) return i;
      return { ...i, items: (i.items || []).map(s => s.id === subId ? { ...s, ...changes } : s) };
    }), msg);
  };

  const removeSubtask = (folderId, subId) => {
    persist(normalized.map(i => {
      if (i.id !== folderId) return i;
      return { ...i, items: (i.items || []).filter(s => s.id !== subId) };
    }), 'Subtask removed');
  };

  const getUrgency = (t) => {
    if (t.done) return { color: styles.green, label: 'DONE' };
    if (!t.dueDate) return { color: styles.steel, label: '' };
    const d = new Date(t.dueDate);
    const diff = Math.round((d - today) / 86400000);
    if (diff < 0) return { color: styles.red, label: `OVERDUE ${Math.abs(diff)}D` };
    if (diff === 0) return { color: styles.orange, label: 'TODAY' };
    if (diff <= 2) return { color: styles.orange, label: `${diff}D` };
    if (diff <= 7) return { color: styles.yellow, label: `${diff}D` };
    return { color: styles.steel, label: t.dueDate };
  };

  // Filter logic: a folder shows if it has items matching, plus filter for top-level tasks
  const filtered = normalized.filter(it => {
    if (it.kind === 'folder') {
      if (filter === 'all') return true;
      const hasMatch = (it.items || []).some(s => filter === 'open' ? !s.done : s.done);
      return hasMatch || (it.items || []).length === 0;
    }
    if (filter === 'open') return !it.done;
    if (filter === 'done') return it.done;
    return true;
  }).sort((a, b) => {
    // Folders first, then tasks by urgency
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    if (a.kind === 'task' && b.kind === 'task') {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && !b.dueDate) return -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    }
    return 0;
  });

  // Counts
  const allTasks = normalized.filter(i => i.kind === 'task');
  const allSubs = normalized.filter(i => i.kind === 'folder').flatMap(f => f.items || []);
  const counts = {
    open: allTasks.filter(t => !t.done).length + allSubs.filter(s => !s.done).length,
    done: allTasks.filter(t => t.done).length + allSubs.filter(s => s.done).length,
    all: allTasks.length + allSubs.length
  };

  const AssigneePicker = ({ value, onChange: onCh, compact }) => {
    if (employeeNames.length === 0) {
      return (
        <input value={value || ''} onChange={e => onCh(e.target.value)} placeholder="Assign to..."
          style={{
            padding: compact ? 6 : 10, background: styles.bg,
            border: `1px solid ${styles.border}`, color: styles.text,
            fontFamily: 'JetBrains Mono, monospace', fontSize: compact ? 11 : 13, outline: 'none', width: '100%'
          }} />
      );
    }
    return (
      <select value={value || ''} onChange={e => onCh(e.target.value)} style={{
        padding: compact ? 6 : 10, background: styles.bg,
        border: `1px solid ${styles.border}`, color: styles.text,
        fontFamily: 'JetBrains Mono, monospace', fontSize: compact ? 11 : 13, outline: 'none', width: '100%'
      }}>
        <option value="">— Assignee —</option>
        {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    );
  };

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}` }}>
        {[{ id: 'open', label: 'Open' }, { id: 'done', label: 'Done' }, { id: 'all', label: 'All' }].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'none', border: 'none',
              color: active ? styles.yellow : styles.textDim,
              padding: '10px 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? styles.yellow : 'transparent'}`,
              fontWeight: 600
            }}>
              {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.6 }}>({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      {/* Add bar */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16 }}>
        {/* Kind toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[
            { id: 'task', label: 'TASK', icon: ListChecks, hint: 'with note + due date' },
            { id: 'folder', label: 'CHECKLIST', icon: Folder, hint: 'group of subtasks' }
          ].map(k => {
            const Ic = k.icon;
            const active = draftKind === k.id;
            return (
              <button key={k.id} onClick={() => setDraftKind(k.id)} style={{
                background: active ? styles.yellow : styles.bg,
                color: active ? styles.bg : styles.text,
                border: `1.5px solid ${active ? styles.yellow : styles.border}`,
                padding: '6px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600
              }}>
                <Ic size={14} /> {k.label}
                <span style={{ fontSize: 9, opacity: 0.7, fontWeight: 400 }}>· {k.hint}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', marginBottom: 8 }}>
          <input
            value={draftText} onChange={e => setDraftText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && draftKind === 'folder' && add()}
            placeholder={draftKind === 'folder' ? 'Checklist name (e.g. Pre-pour, Inspection)...' : 'What needs doing?'}
            style={{
              flex: 1, padding: 10, background: styles.bg,
              border: `1px solid ${styles.border}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
          <VoiceButton onTranscript={(t) => setDraftText(draftText ? `${draftText} ${t}` : t)} />
        </div>

        {draftKind === 'task' && (
          <>
            <input
              value={draftNote} onChange={e => setDraftNote(e.target.value)}
              placeholder="Short note (optional)..."
              style={{
                width: '100%', padding: 10, background: styles.bg,
                border: `1px solid ${styles.border}`, color: styles.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none', marginBottom: 6
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
              <input
                type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)}
                style={{
                  padding: 10, background: styles.bg,
                  border: `1px solid ${styles.border}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none'
                }}
              />
              <AssigneePicker value={draftAssignee} onChange={setDraftAssignee} />
              <button onClick={add} style={{
                background: styles.yellow, color: styles.bg, border: 'none',
                padding: '0 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
                cursor: 'pointer', fontWeight: 700
              }}>ADD</button>
            </div>
          </>
        )}
        {draftKind === 'folder' && (
          <button onClick={add} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
            cursor: 'pointer', fontWeight: 700, width: '100%'
          }}>+ ADD CHECKLIST</button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <ListChecks size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No {filter === 'all' ? '' : filter} items</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {filtered.map(item => {
            if (item.kind === 'folder') {
              return (
                <ChecklistFolder
                  key={item.id}
                  folder={item}
                  filter={filter}
                  AssigneePicker={AssigneePicker}
                  onToggleExpanded={() => updateItem(item.id, { expanded: !item.expanded })}
                  onRename={(name) => updateItem(item.id, { name }, `Checklist renamed: ${name}`)}
                  onDelete={() => { if (confirm(`Delete checklist "${item.name}" and all its items?`)) removeItem(item); }}
                  onAddSub={(text) => addSubtask(item.id, text)}
                  onUpdateSub={(subId, changes, msg) => updateSubtask(item.id, subId, changes, msg)}
                  onRemoveSub={(subId) => removeSubtask(item.id, subId)}
                  getUrgency={getUrgency}
                />
              );
            }
            // Task
            const u = getUrgency(item);
            const editing = editingId === item.id;
            return (
              <div key={item.id} style={{
                background: styles.surface, border: `1px solid ${styles.border}`,
                borderLeft: `4px solid ${u.color}`,
                padding: 10, opacity: item.done ? 0.55 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <button onClick={() => toggleTask(item)} style={{
                    width: 22, height: 22, marginTop: 1, flexShrink: 0,
                    background: item.done ? styles.green : 'transparent',
                    border: `2px solid ${item.done ? styles.green : styles.borderLight}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {item.done && <Check size={14} color={styles.bg} strokeWidth={3} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editing ? (
                      <div style={{ display: 'grid', gap: 6 }}>
                        <input
                          value={item.text} onChange={e => updateItem(item.id, { text: e.target.value }, 'Task updated')}
                          style={{
                            padding: 8, background: styles.bg, border: `1px solid ${styles.borderLight}`,
                            color: styles.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                          }}
                        />
                        <input
                          value={item.note || ''} onChange={e => updateItem(item.id, { note: e.target.value })}
                          placeholder="Short note..."
                          style={{
                            padding: 8, background: styles.bg, border: `1px solid ${styles.borderLight}`,
                            color: styles.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none'
                          }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <input type="date" value={item.dueDate || ''} onChange={e => updateItem(item.id, { dueDate: e.target.value })}
                            style={{ padding: 8, background: styles.bg, border: `1px solid ${styles.borderLight}`, color: styles.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none' }} />
                          <AssigneePicker value={item.assignee} onChange={(v) => updateItem(item.id, { assignee: v })} compact={false} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</div>
                        {item.note && <div style={{ fontSize: 11, color: styles.textDim, marginTop: 3, fontStyle: 'italic' }}>{item.note}</div>}
                        <div style={{ fontSize: 10, color: styles.textDim, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {item.dueDate && <span>📅 Due {item.dueDate}</span>}
                          {item.assignee && <span>👤 {item.assignee}</span>}
                          {item.done && item.completedAt && <span style={{ color: styles.green }}>✓ {new Date(item.completedAt).toLocaleDateString('en-CA')}</span>}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!item.done && u.label && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: u.color,
                        letterSpacing: 1, padding: '4px 6px', alignSelf: 'flex-start',
                        border: `1px solid ${u.color}`, whiteSpace: 'nowrap'
                      }}>{u.label}</div>
                    )}
                    <button onClick={() => setEditingId(editing ? null : item.id)} title="Edit" style={{
                      width: 24, height: 24, background: editing ? styles.yellow : 'transparent',
                      border: `1.5px solid ${editing ? styles.yellow : styles.borderLight}`,
                      color: editing ? styles.bg : styles.textDim, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><Edit3 size={11} /></button>
                    <button onClick={() => removeItem(item)} title="Delete" style={{
                      width: 24, height: 24, background: 'transparent',
                      border: `1.5px solid ${styles.borderLight}`,
                      color: styles.textFaint, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============ CHECKLIST FOLDER (a group of simple subtasks) ============
function ChecklistFolder({ folder, filter, AssigneePicker, onToggleExpanded, onRename, onDelete, onAddSub, onUpdateSub, onRemoveSub, getUrgency }) {
  const [subDraft, setSubDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [pickingDateFor, setPickingDateFor] = useState(null);
  const [pickingAssigneeFor, setPickingAssigneeFor] = useState(null);

  const subs = folder.items || [];
  const filteredSubs = subs.filter(s => {
    if (filter === 'open') return !s.done;
    if (filter === 'done') return s.done;
    return true;
  });
  const openCount = subs.filter(s => !s.done).length;
  const doneCount = subs.filter(s => s.done).length;
  const total = subs.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, borderLeft: `4px solid ${styles.steel}` }}>
      {/* Folder header */}
      <div style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8, borderBottom: folder.expanded ? `1px solid ${styles.border}` : 'none' }}>
        <button onClick={onToggleExpanded} style={{
          background: 'none', border: 'none', color: styles.textDim, cursor: 'pointer', padding: 2,
          display: 'flex', alignItems: 'center'
        }}>
          <ChevronRight size={18} style={{ transform: folder.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        <Folder size={16} color={styles.steel} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {renaming ? (
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              onBlur={() => { onRename(newName.trim() || folder.name); setRenaming(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onRename(newName.trim() || folder.name); setRenaming(false); } }}
              autoFocus
              style={{
                padding: '4px 6px', background: styles.bg, border: `1px solid ${styles.borderLight}`,
                color: styles.text, fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 600,
                outline: 'none', width: '100%'
              }}
            />
          ) : (
            <div onClick={() => { setNewName(folder.name); setRenaming(true); }} style={{
              fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 600, letterSpacing: 0.5, cursor: 'text'
            }}>{folder.name}</div>
          )}
          <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
            {openCount} OPEN · {doneCount} DONE {total > 0 && `· ${pct}%`}
          </div>
        </div>
        {/* Mini progress bar */}
        {total > 0 && (
          <div style={{ width: 60, height: 4, background: styles.bg, flexShrink: 0 }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: pct === 100 ? styles.green : styles.yellow,
              transition: 'width 0.3s'
            }} />
          </div>
        )}
        <button onClick={onDelete} title="Delete checklist" style={{
          width: 24, height: 24, background: 'transparent',
          border: `1px solid ${styles.borderLight}`, color: styles.textFaint, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}><Trash2 size={11} /></button>
      </div>

      {/* Folder body */}
      {folder.expanded && (
        <div style={{ padding: 10 }}>
          {/* Add subtask */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              value={subDraft} onChange={e => setSubDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && subDraft.trim()) { onAddSub(subDraft); setSubDraft(''); } }}
              placeholder="Add a subtask..."
              style={{
                flex: 1, padding: 8, background: styles.bg,
                border: `1px solid ${styles.borderLight}`, color: styles.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, outline: 'none'
              }}
            />
            <button onClick={() => { if (subDraft.trim()) { onAddSub(subDraft); setSubDraft(''); } }} style={{
              background: styles.steel, color: styles.bg, border: 'none',
              padding: '0 14px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
              cursor: 'pointer', fontWeight: 700
            }}>ADD</button>
          </div>

          {filteredSubs.length === 0 ? (
            <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: styles.textFaint, fontStyle: 'italic' }}>
              {subs.length === 0 ? 'No items yet' : `No ${filter === 'all' ? '' : filter} items`}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 3 }}>
              {filteredSubs.map(s => {
                const u = getUrgency(s);
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    background: s.done ? styles.bg : 'transparent',
                    borderLeft: `2px solid ${u.color}`,
                    opacity: s.done ? 0.55 : 1
                  }}>
                    <button onClick={() => onUpdateSub(s.id, { done: !s.done, completedAt: !s.done ? Date.now() : null }, s.done ? `Reopened: ${s.text}` : `Done: ${s.text}`)} style={{
                      width: 18, height: 18, flexShrink: 0,
                      background: s.done ? styles.green : 'transparent',
                      border: `1.5px solid ${s.done ? styles.green : styles.borderLight}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {s.done && <Check size={11} color={styles.bg} strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</div>
                      <div style={{ fontSize: 9, color: styles.textDim, display: 'flex', gap: 8, marginTop: 1 }}>
                        {s.dueDate && <span style={{ color: u.color, fontWeight: 700 }}>📅 {s.dueDate}</span>}
                        {s.assignee && <span>👤 {s.assignee}</span>}
                      </div>
                    </div>

                    {/* Date picker popover */}
                    {pickingDateFor === s.id ? (
                      <input
                        type="date" value={s.dueDate || ''}
                        onChange={e => { onUpdateSub(s.id, { dueDate: e.target.value }, 'Date set'); setPickingDateFor(null); }}
                        onBlur={() => setPickingDateFor(null)}
                        autoFocus
                        style={{
                          padding: 4, fontSize: 11, background: styles.bg,
                          border: `1px solid ${styles.yellow}`, color: styles.text,
                          fontFamily: 'JetBrains Mono, monospace', outline: 'none'
                        }}
                      />
                    ) : (
                      <button onClick={() => setPickingDateFor(s.id)} title="Set due date" style={{
                        width: 22, height: 22, background: s.dueDate ? styles.yellow : 'transparent',
                        color: s.dueDate ? styles.bg : styles.textDim,
                        border: `1px solid ${s.dueDate ? styles.yellow : styles.borderLight}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}><Calendar size={11} /></button>
                    )}

                    {/* Assignee picker */}
                    {pickingAssigneeFor === s.id ? (
                      <div style={{ position: 'relative' }} onMouseLeave={() => setTimeout(() => setPickingAssigneeFor(null), 200)}>
                        <AssigneePicker value={s.assignee} onChange={(v) => { onUpdateSub(s.id, { assignee: v }, v ? `Assigned to ${v}` : 'Unassigned'); setPickingAssigneeFor(null); }} compact />
                      </div>
                    ) : (
                      <button onClick={() => setPickingAssigneeFor(s.id)} title="Assign" style={{
                        width: 22, height: 22, background: s.assignee ? styles.steel : 'transparent',
                        color: s.assignee ? styles.bg : styles.textDim,
                        border: `1px solid ${s.assignee ? styles.steel : styles.borderLight}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}><User size={11} /></button>
                    )}

                    <button onClick={() => onRemoveSub(s.id)} title="Remove" style={{
                      width: 22, height: 22, background: 'transparent',
                      border: `1px solid ${styles.borderLight}`, color: styles.textFaint, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><X size={11} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ ACTIVITY FEED VIEW ============
function ActivityView({ activity }) {
  if (activity.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
        <Activity size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
        <div style={{ fontSize: 12 }}>No activity yet</div>
      </div>
    );
  }

  // Group by date
  const groups = {};
  activity.forEach(a => {
    const d = new Date(a.at);
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  const dates = Object.keys(groups).sort().reverse();

  const typeColors = {
    job_created: styles.green,
    task: styles.yellow,
    rfi: styles.orange,
    co: styles.orange,
    tool: styles.text,
    photo: styles.steel,
    material: styles.text,
    progress: styles.yellow,
    update: styles.textDim
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div style={{ fontSize: 11, color: styles.textDim, marginBottom: 16 }}>
        Every change to this job is logged here. In Phase 2 with multi-user, you'll see who made each change.
      </div>
      {dates.map(date => {
        const dateLabel = date === todayStr ? 'TODAY' :
          new Date(date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ height: 1, background: styles.border, flex: 1 }} />
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, fontFamily: 'Oswald, sans-serif' }}>{dateLabel}</div>
              <div style={{ height: 1, background: styles.border, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {groups[date].map(a => (
                <div key={a.id} style={{
                  background: styles.surface, border: `1px solid ${styles.border}`,
                  borderLeft: `3px solid ${typeColors[a.type] || styles.textDim}`,
                  padding: '8px 10px',
                  display: 'flex', justifyContent: 'space-between', gap: 10
                }}>
                  <div style={{ fontSize: 12, flex: 1 }}>{a.text}</div>
                  <div style={{ fontSize: 10, color: styles.textFaint, whiteSpace: 'nowrap' }}>
                    {new Date(a.at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ============ LIBRARY VIEW (Code books, manuals, etc.) ============
const LIBRARY_CATEGORIES = [
  { id: 'codes', label: 'Codes', desc: 'BC Plumbing Code, BCBC Books I/II, ASHRAE, SMACNA', icon: BookOpen, color: styles.yellow },
  { id: 'manuals', label: 'Product Manuals', desc: 'Viega, Uponor, Bradford White, RIDGID, Milwaukee', icon: Wrench, color: styles.steel },
  { id: 'specs', label: 'Spec Sheets', desc: 'Manufacturer cut sheets and submittals', icon: FileText, color: styles.text },
  { id: 'pmcStandards', label: 'PMC Standards', desc: 'Internal SOPs, scope language, install standards', icon: Hammer, color: styles.yellow },
  { id: 'safety', label: 'Safety / WorkSafeBC', desc: 'JSAs, SDS sheets, COR docs, safety bulletins', icon: HardHat, color: styles.orange }
];

function LibraryView({ library, onSave, onBack }) {
  const [activeCategory, setActiveCategory] = useState(null);

  if (activeCategory) {
    const cat = LIBRARY_CATEGORIES.find(c => c.id === activeCategory);
    return (
      <LibraryCategoryView
        category={cat}
        items={library[activeCategory] || []}
        onChange={(newItems) => onSave({ ...library, [activeCategory]: newItems })}
        onBack={() => setActiveCategory(null)}
      />
    );
  }

  const totalItems = LIBRARY_CATEGORIES.reduce((sum, c) => sum + (library[c.id] || []).length, 0);

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>REFERENCE LIBRARY</div>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 4 }}>
          {totalItems} DOCUMENTS · POWERS MATTGPT IN PHASE 2
        </div>
      </div>

      {/* MattGPT promo card */}
      <div style={{
        background: `linear-gradient(135deg, ${styles.steelDark} 0%, ${styles.surface} 100%)`,
        border: `1px solid ${styles.steel}`,
        padding: 16, marginBottom: 20,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.1 }}>
          <MessageSquare size={120} color={styles.steel} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: styles.steel, letterSpacing: 2, fontWeight: 700 }}>EVERY DOCUMENT YOU UPLOAD HERE...</div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 18, marginTop: 4, lineHeight: 1.3, maxWidth: 500 }}>
            ...becomes searchable in MattGPT in Phase 2. Start building your library now so it's ready when MattGPT goes live.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {LIBRARY_CATEGORIES.map(cat => {
          const count = (library[cat.id] || []).length;
          const Ic = cat.icon;
          return (
            <div key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              background: styles.surface, border: `1px solid ${styles.border}`,
              borderLeft: `4px solid ${cat.color}`,
              padding: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <Ic size={24} color={cat.color} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, letterSpacing: 1, fontWeight: 600 }}>{cat.label.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: styles.textDim, marginTop: 2 }}>{cat.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: cat.color, fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1 }}>{count === 1 ? 'DOC' : 'DOCS'}</div>
              </div>
              <ChevronRight size={18} color={styles.textDim} />
            </div>
          );
        })}
      </div>

      {/* Suggested docs */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>SUGGESTED FOR PMC</div>
        <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14, fontSize: 12, lineHeight: 1.7 }}>
          <strong style={{ color: styles.yellow }}>Codes (priority):</strong> BC Plumbing Code 2024 (BCBC Book II), BC Building Code 2024 (Book I), BC Fire Code 2024, ASHRAE 62.1 Ventilation, SMACNA HVAC Duct Construction Standards 4th Ed., CSA B149.1 Gas Code<br />
          <strong style={{ color: styles.steel, marginTop: 8, display: 'inline-block' }}>Manufacturer manuals:</strong> Viega ProPress installation guide, Uponor PEX-A install manual, Bradford White water heater install guides, RIDGID press tool manual, Milwaukee tool manuals<br />
          <strong style={{ color: styles.yellow, marginTop: 8, display: 'inline-block' }}>PMC Standards (build these):</strong> PMC scope-of-work template, PMC install standards (copper, PEX, ABS), PMC warranty terms, PMC safety policies, common RFI responses
        </div>
      </div>
    </div>
  );
}

function LibraryCategoryView({ category, items, onChange, onBack }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: '', edition: '', publisher: '', url: '', tags: '', notes: '' });
  const [search, setSearch] = useState('');

  const add = () => {
    if (!draft.title.trim()) return;
    onChange([{ id: `lib_${Date.now()}`, ...draft, addedAt: Date.now() }, ...items]);
    setDraft({ title: '', edition: '', publisher: '', url: '', tags: '', notes: '' });
    setAdding(false);
  };
  const remove = (id) => {
    if (confirm('Remove this document?')) onChange(items.filter(i => i.id !== id));
  };

  const Ic = category.icon;
  const filtered = items.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (i.title || '').toLowerCase().includes(s) ||
           (i.publisher || '').toLowerCase().includes(s) ||
           (i.tags || '').toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Library" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Ic size={28} color={category.color} />
        <div>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, letterSpacing: 1.5, fontWeight: 700 }}>{category.label.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: styles.textDim, marginTop: 2 }}>{category.desc}</div>
        </div>
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center', background: styles.surface, border: `1px solid ${styles.border}`, padding: 8 }}>
          <Search size={16} color={styles.textDim} style={{ marginLeft: 4 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, publisher, tag..."
            style={{
              flex: 1, padding: 6, background: 'none',
              border: 'none', color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
        </div>
      )}

      {/* Add button or form */}
      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          background: category.color, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', marginBottom: 16, fontWeight: 700
        }}>+ ADD DOCUMENT</button>
      ) : (
        <div style={{ background: styles.surface, border: `1px solid ${category.color}`, padding: 16, marginBottom: 16 }}>
          <Field label="Title *" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} placeholder={category.id === 'codes' ? 'BC Plumbing Code 2024' : 'Document title'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Edition / Version" value={draft.edition} onChange={v => setDraft({ ...draft, edition: v })} placeholder="2024 / Rev 5" />
            <Field label="Publisher / Manufacturer" value={draft.publisher} onChange={v => setDraft({ ...draft, publisher: v })} placeholder={category.id === 'manuals' ? 'Viega' : 'Province of BC'} />
          </div>
          <Field label="Document Link (PDF in Dropbox / SharePoint / Drive)" value={draft.url} onChange={v => setDraft({ ...draft, url: v })} placeholder="https://..." />
          <Field label="Tags (comma-separated)" value={draft.tags} onChange={v => setDraft({ ...draft, tags: v })} placeholder="DWV, venting, slope, drainage" />
          <Field label="Notes" value={draft.notes} onChange={v => setDraft({ ...draft, notes: v })} multiline placeholder="Anything useful — sections most referenced, install gotchas..." />
          <div style={{ fontSize: 10, color: styles.textDim, padding: 8, background: styles.bg, marginBottom: 10, lineHeight: 1.5 }}>
            ℹ Phase 1 stores the link and metadata. Phase 2 will index the full PDF content for MattGPT to search and cite.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={{ background: category.color, color: styles.bg, border: 'none', padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>SAVE</button>
            <button onClick={() => setAdding(false)} style={{ background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`, padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <Ic size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>{search ? 'No matches' : 'No documents yet'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(doc => (
            <div key={doc.id} style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.title}</div>
                  <div style={{ fontSize: 10, color: styles.textDim, marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {doc.publisher && <span>{doc.publisher}</span>}
                    {doc.edition && <span>· {doc.edition}</span>}
                  </div>
                  {doc.tags && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {doc.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                        <span key={i} style={{
                          fontSize: 9, padding: '2px 6px', background: styles.bg,
                          color: styles.steel, border: `1px solid ${styles.steelDark}`,
                          letterSpacing: 0.5
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  {doc.notes && <div style={{ fontSize: 11, color: styles.textDim, marginTop: 6, fontStyle: 'italic' }}>{doc.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: category.color, padding: 6 }}><ExternalLink size={16} /></a>}
                  <button onClick={() => remove(doc.id)} style={{ background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer', padding: 6 }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ MATTGPT VIEW (Phase 2 placeholder) ============
function MattGPTView({ library, onBack, onGoToLibrary }) {
  const [demo, setDemo] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const totalDocs = LIBRARY_CATEGORIES.reduce((sum, c) => sum + (library[c.id] || []).length, 0);

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${styles.steelDark} 0%, ${styles.bg} 100%)`,
        border: `1px solid ${styles.steel}`,
        padding: 20, marginBottom: 16,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
          <MessageSquare size={180} color={styles.steel} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              background: styles.steel, color: styles.bg,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 15
            }}>M</div>
            <div>
              <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 24, letterSpacing: 1.5, fontWeight: 700 }}>MATTGPT</div>
              <div style={{ fontSize: 10, color: styles.steel, letterSpacing: 2, fontWeight: 600 }}>PMC's CODE & SPEC ASSISTANT</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: styles.text, lineHeight: 1.5, maxWidth: 600, marginTop: 12 }}>
            Ask any question about BC Plumbing Code, SMACNA standards, manufacturer specs, or PMC's own install standards. MattGPT cites the exact section and page from your library.
          </div>
        </div>
      </div>

      {/* Phase 2 banner */}
      <div style={{
        background: styles.surface, border: `2px solid ${styles.yellow}`,
        padding: 16, marginBottom: 16,
        display: 'flex', gap: 14, alignItems: 'flex-start'
      }}>
        <div style={{
          background: styles.yellow, color: styles.bg,
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontWeight: 700, fontSize: 16
        }}>!</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1, color: styles.yellow, marginBottom: 4 }}>
            COMING IN PHASE 2
          </div>
          <div style={{ fontSize: 12, color: styles.text, lineHeight: 1.6 }}>
            MattGPT requires a backend (PDF processing + vector search + LLM API). It can't run inside this artifact, but it's the first feature we'll build when we deploy the real web app.
            <br /><br />
            <strong style={{ color: styles.yellow }}>What you can do now:</strong> Build your library. Every code book, manual, and PMC standard you upload to the Library folder becomes searchable when MattGPT goes live. You currently have <strong style={{ color: styles.yellow }}>{totalDocs} documents</strong> — aim for 20+ before launch for best results.
          </div>
          <button onClick={onGoToLibrary} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '8px 14px', marginTop: 10, fontFamily: 'Oswald, sans-serif',
            fontSize: 11, letterSpacing: 1.5, cursor: 'pointer', fontWeight: 700
          }}>→ GO TO LIBRARY</button>
        </div>
      </div>

      {/* What MattGPT will do */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, marginBottom: 10, color: styles.steel }}>
          ▸ WHAT MATTGPT WILL ANSWER
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {[
            { q: 'What is the minimum slope for a 4" sanitary drain in BC?', src: 'BC Plumbing Code 2024' },
            { q: 'What gauge sheet metal do I need for 24x18" duct at 1" w.g.?', src: 'SMACNA HVAC Duct Construction Standards 4th Ed.' },
            { q: 'What is the install torque for 3/4" Viega ProPress?', src: 'Viega ProPress installation manual' },
            { q: 'What\'s PMC\'s standard for in-slab water lines on residential?', src: 'PMC Internal Standards' },
            { q: 'What backflow preventer do I need for irrigation in Surrey?', src: 'BC Plumbing Code 4.7.2 + AHJ' },
            { q: 'How many fixture units can a 3" drain handle?', src: 'BC Plumbing Code Table 2.5.3.A' }
          ].map((ex, i) => (
            <div key={i} style={{
              background: styles.surface, border: `1px solid ${styles.border}`,
              padding: 10
            }}>
              <div style={{ fontSize: 12, color: styles.text }}>"{ex.q}"</div>
              <div style={{ fontSize: 10, color: styles.steel, marginTop: 4, letterSpacing: 0.5 }}>→ MattGPT cites: {ex.src}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <details style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, color: styles.steel }}>
          ▸ HOW IT WILL WORK (TECHNICAL)
        </summary>
        <div style={{ fontSize: 11, color: styles.textDim, marginTop: 10, lineHeight: 1.7 }}>
          <strong style={{ color: styles.text }}>Architecture:</strong> Retrieval-Augmented Generation (RAG). When you ask a question, MattGPT searches your uploaded documents for relevant sections, then sends those sections plus your question to Claude (the LLM) to generate a grounded answer with citations.
          <br /><br />
          <strong style={{ color: styles.text }}>Stack:</strong>
          <br />• PDF processing: extract text + chunk per page/section
          <br />• Vector embeddings: each chunk converted to numbers that capture meaning
          <br />• Vector database: Supabase pgvector for fast similarity search
          <br />• LLM: Anthropic Claude API for answer generation
          <br />• Citations: every answer links back to specific page in original document
          <br /><br />
          <strong style={{ color: styles.text }}>Why RAG (not just trained AI):</strong> Generic AI hallucinates code citations. RAG forces every answer to be grounded in your real documents. If MattGPT can't find the answer in your library, it says so — never makes up a code section.
          <br /><br />
          <strong style={{ color: styles.text }}>Cost:</strong> ~$5–20/month for the whole PMC team's usage.
        </div>
      </details>

      {/* Demo (mock) */}
      <div style={{ background: styles.surface, border: `1px dashed ${styles.steelDark}`, padding: 14 }}>
        <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>PREVIEW (NON-FUNCTIONAL DEMO)</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          <input
            value={demo} onChange={e => setDemo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setShowDemo(true)}
            placeholder="Try asking: minimum slope for 4 inch drain"
            style={{
              flex: 1, padding: 12, background: styles.bg,
              border: `1px solid ${styles.borderLight}`, color: styles.text,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
            }}
          />
          <button onClick={() => setShowDemo(true)} disabled={!demo.trim()} style={{
            background: demo.trim() ? styles.steel : styles.surfaceLight,
            color: demo.trim() ? styles.bg : styles.textFaint,
            border: 'none', padding: '0 16px', cursor: demo.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Send size={18} />
          </button>
        </div>
        {showDemo && (
          <div style={{ marginTop: 12, padding: 12, background: styles.bg, borderLeft: `3px solid ${styles.steel}` }}>
            <div style={{ fontSize: 10, color: styles.steel, letterSpacing: 1.5, marginBottom: 6 }}>MATTGPT (PREVIEW)</div>
            <div style={{ fontSize: 12, color: styles.text, lineHeight: 1.6 }}>
              This is a preview of what MattGPT will look like. In Phase 2, your question would be processed against your uploaded documents and a real, cited answer would appear here. For now, build your library — the more documents you add, the smarter MattGPT will be at launch.
            </div>
            <button onClick={() => { setShowDemo(false); setDemo(''); }} style={{
              background: 'none', border: `1px solid ${styles.border}`, color: styles.textDim,
              padding: '6px 10px', marginTop: 10, fontSize: 10, letterSpacing: 1, cursor: 'pointer',
              fontFamily: 'Oswald, sans-serif'
            }}>CLEAR</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ SERVICE VIEW (top-level: list of service calls) ============
function ServiceView({ serviceCalls, employees, onSave, onDelete, onBack }) {
  const [activeCallId, setActiveCallId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState('all'); // all | upcoming | inProgress | complete

  const activeCall = serviceCalls.find(c => c.id === activeCallId);

  const getStatus = (call) => {
    if (call.status) return call.status;
    if (call.completedAt) return 'complete';
    if (call.scheduledDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      const sched = new Date(call.scheduledDate);
      if (sched > today) return 'upcoming';
      return 'inProgress';
    }
    return 'upcoming';
  };

  const filtered = serviceCalls.filter(c => {
    if (filter === 'all') return true;
    return getStatus(c) === filter;
  });

  const counts = {
    all: serviceCalls.length,
    upcoming: serviceCalls.filter(c => getStatus(c) === 'upcoming').length,
    inProgress: serviceCalls.filter(c => getStatus(c) === 'inProgress').length,
    complete: serviceCalls.filter(c => getStatus(c) === 'complete').length
  };

  if (activeCall) {
    return (
      <ServiceCallView
        call={activeCall}
        employees={employees}
        onSave={onSave}
        onDelete={(id) => { onDelete(id); setActiveCallId(null); }}
        onBack={() => setActiveCallId(null)}
      />
    );
  }

  if (showNew) {
    return (
      <ServiceCallEditor
        call={null}
        employees={employees}
        onSave={(c) => { onSave(c); setShowNew(false); setActiveCallId(c.id); }}
        onCancel={() => setShowNew(false)}
      />
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Hammer size={28} color={styles.orange} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>SERVICE CALLS</div>
            <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              {counts.upcoming} UPCOMING · {counts.inProgress} IN PROGRESS · {counts.complete} COMPLETE
            </div>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          background: styles.orange, color: styles.bg, border: 'none',
          padding: '12px 18px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
          fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Plus size={14} strokeWidth={3} /> NEW CALL
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}`, overflowX: 'auto' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'upcoming', label: 'Upcoming', color: styles.steel },
          { id: 'inProgress', label: 'In Progress', color: styles.orange },
          { id: 'complete', label: 'Complete', color: styles.green }
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'none', border: 'none',
              color: active ? (t.color || styles.yellow) : styles.textDim,
              padding: '10px 14px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? (t.color || styles.yellow) : 'transparent'}`,
              fontWeight: 600, whiteSpace: 'nowrap'
            }}>
              {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.6 }}>({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          border: `2px dashed ${styles.border}`, padding: 40, textAlign: 'center',
          background: styles.surface
        }}>
          <Hammer size={40} color={styles.textFaint} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, color: styles.textDim, marginBottom: 12 }}>
            NO {filter === 'all' ? '' : filter.toUpperCase()} SERVICE CALLS
          </div>
          {filter === 'all' && (
            <button onClick={() => setShowNew(true)} style={{
              background: styles.orange, color: styles.bg, border: 'none',
              padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
              fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
            }}>+ CREATE FIRST CALL</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(call => {
            const status = getStatus(call);
            const statusColors = { upcoming: styles.steel, inProgress: styles.orange, complete: styles.green };
            const statusLabels = { upcoming: 'UPCOMING', inProgress: 'IN PROGRESS', complete: 'COMPLETE' };
            const statusColor = statusColors[status];
            const totalHours = (call.workEntries || []).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
            return (
              <div key={call.id} onClick={() => setActiveCallId(call.id)} style={{
                background: styles.surface, border: `1px solid ${styles.border}`,
                borderLeft: `4px solid ${statusColor}`,
                padding: 14, cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: styles.orange, letterSpacing: 1.5, fontWeight: 700 }}>
                        {call.serviceCode || `S-DRAFT`}
                      </span>
                      <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, fontWeight: 600 }}>
                        {call.projectName || 'Untitled service call'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: styles.textDim, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {call.customerName && <span>👤 {call.customerName}</span>}
                      {call.address && <span>📍 {call.address}</span>}
                      {call.scheduledDate && <span>📅 {call.scheduledDate}</span>}
                      {totalHours > 0 && <span>⏱ {totalHours}h</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: statusColor,
                      letterSpacing: 1, padding: '4px 8px',
                      border: `1px solid ${statusColor}`,
                      whiteSpace: 'nowrap'
                    }}>{statusLabels[status]}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ SERVICE CALL VIEW (full work order) ============
function ServiceCallView({ call, employees, onSave, onDelete, onBack }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ServiceCallEditor
        call={call}
        employees={employees}
        onSave={(c) => { onSave(c); setEditing(false); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const totalHours = (call.workEntries || []).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
  const totalCost = parseFloat(call.totalCost) || 0;

  const statusOptions = [
    { id: 'upcoming', label: 'UPCOMING', color: styles.steel },
    { id: 'inProgress', label: 'IN PROGRESS', color: styles.orange },
    { id: 'complete', label: 'COMPLETE', color: styles.green }
  ];

  const updateStatus = (status) => {
    const updates = { ...call, status };
    if (status === 'complete' && !call.completedAt) updates.completedAt = Date.now();
    if (status !== 'complete') updates.completedAt = null;
    onSave(updates);
  };

  const printWorkOrder = () => {
    // Open a print-friendly version in a new window
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for printing.');
      return;
    }
    win.document.write(buildPrintableWorkOrder(call));
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const emailWorkOrder = () => {
    const subject = `Work Order ${call.serviceCode || ''} — ${call.projectName || 'PMC Service'}`;
    const lines = [
      `WORK ORDER`,
      `PMC PRESTIGE MECHANICAL CONTRACTING LTD.`,
      ``,
      `Service Code: ${call.serviceCode || '—'}`,
      `Customer: ${call.customerName || '—'}`,
      `Company: ${call.companyName || '—'}`,
      `Project: ${call.projectName || '—'}`,
      `Address: ${call.address || '—'}`,
      `Customer Phone: ${call.customerPhone || '—'}`,
      `Customer PO: ${call.customerPO || '—'}`,
      `Scheduled: ${call.scheduledDate || '—'}`,
      ``,
      `WORK PERFORMED:`,
      call.workReport || '(no report yet)',
      ``,
      `LOG:`,
      ...(call.workEntries || []).map(e => {
        const mat = e.materialSource ? ` | ${e.materialSource}` : '';
        return `${e.date || '?'} — ${e.workerName || '?'} — ${e.hours || 0}h${mat}${e.notes ? ` (${e.notes})` : ''}`;
      }),
      ``,
      `Total hours: ${totalHours}`,
      `Total: $${totalCost.toFixed(2)}`,
      ``,
      `Status: ${(call.status || 'upcoming').toUpperCase()}`
    ];
    const body = lines.join('\n');
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Service Calls" />

      {/* Letterhead-style header matching the work order doc */}
      <div style={{ background: '#fff', color: '#1a1a1a', padding: 20, marginBottom: 16, border: `1px solid ${styles.borderLight}` }}>
        <div style={{
          background: '#5B7B9C', color: '#fff', padding: '12px 16px', marginBottom: 14,
          fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 2, textAlign: 'center'
        }}>WORK ORDER</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ width: 110 }}>
            <img src={PMC_LOGO} alt="PMC" style={{ width: '100%', height: 'auto' }} />
            <div style={{ fontSize: 10, color: '#5B7B9C', marginTop: 8, fontWeight: 600 }}>(604) 585-1614</div>
            <div style={{ fontSize: 9, color: '#5B7B9C' }}>prestigemechanical@shaw.ca</div>
            <div style={{ fontSize: 9, color: '#1a1a1a', marginTop: 6, fontWeight: 600 }}>9772 160a Street Surrey BC</div>
            <div style={{ fontSize: 9, color: '#1a1a1a' }}>Surrey BC, V4N 5M1</div>
          </div>
          <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.7 }}>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, letterSpacing: 1 }}>
              PMC PRESTIGE MECHANICAL CONTRACTING LTD.
            </div>
            <div>Attention: <strong>{call.customerName || '—'}</strong></div>
            <div>Company: <strong>{call.companyName || '—'}</strong></div>
            <div>Date: <strong>{call.scheduledDate || '—'}</strong></div>
            <div>P.O #: <strong>{call.serviceCode || 'S—'}</strong></div>
            <div style={{ marginTop: 6 }}>Project Name: <strong>{call.projectName || '—'}</strong></div>
            <div>Customer Name: <strong>{call.customerName || '—'}</strong></div>
            <div>Customer #: <strong>{call.customerPhone || '—'}</strong></div>
            <div>Project Address: <strong>{call.address || '—'}</strong></div>
            {call.customerPO && <div>Customer PO: <strong>{call.customerPO}</strong></div>}
          </div>
        </div>

        {/* Work Report Table */}
        <div style={{ marginTop: 20, border: `1px solid #ccc` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.6fr 0.4fr 1fr', background: '#5B7B9C', color: '#fff' }}>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700 }}>Work Report</div>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderLeft: '1px solid #fff8' }}>Date</div>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderLeft: '1px solid #fff8' }}>Manpower</div>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderLeft: '1px solid #fff8' }}>Hours</div>
            <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderLeft: '1px solid #fff8' }}>Materials/Supplier</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.6fr 0.4fr 1fr', minHeight: 200 }}>
            <div style={{ padding: 10, fontSize: 12, color: '#1a1a1a', whiteSpace: 'pre-wrap', borderRight: `1px solid #ccc` }}>
              {call.workReport || <span style={{ color: '#999', fontStyle: 'italic' }}>No work report yet</span>}
            </div>
            <div style={{ borderRight: `1px solid #ccc` }}>
              {(call.workEntries || []).map(e => (
                <div key={e.id} style={{ padding: '4px 8px', fontSize: 11, color: '#1a1a1a', borderBottom: `1px dotted #ddd` }}>{e.date || ''}</div>
              ))}
            </div>
            <div style={{ borderRight: `1px solid #ccc` }}>
              {(call.workEntries || []).map(e => (
                <div key={e.id} style={{ padding: '4px 8px', fontSize: 11, color: '#1a1a1a', borderBottom: `1px dotted #ddd` }}>{e.workerName || ''}</div>
              ))}
            </div>
            <div style={{ borderRight: `1px solid #ccc`, textAlign: 'right' }}>
              {(call.workEntries || []).map(e => (
                <div key={e.id} style={{ padding: '4px 8px', fontSize: 11, color: '#1a1a1a', borderBottom: `1px dotted #ddd` }}>{e.hours || ''}</div>
              ))}
            </div>
            <div>
              {(call.workEntries || []).map(e => (
                <div key={e.id} style={{ padding: '4px 8px', fontSize: 11, color: '#1a1a1a', borderBottom: `1px dotted #ddd` }}>{e.materialSource || ''}</div>
              ))}
            </div>
          </div>
          <div style={{ background: '#f5f5f5', padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#1a1a1a', borderTop: `1px solid #ccc` }}>
            Total: ${totalCost.toFixed(2)} {totalHours > 0 && <span style={{ fontWeight: 400, color: '#666', marginLeft: 12 }}>· {totalHours} hours</span>}
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#666' }}>
          Status: <strong style={{ color: '#1a1a1a' }}>{(call.status || 'upcoming').replace('inProgress', 'In Progress').toUpperCase()}</strong>
        </div>
      </div>

      {/* Status changer */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>STATUS</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {statusOptions.map(s => {
            const active = (call.status || 'upcoming') === s.id;
            return (
              <button key={s.id} onClick={() => updateStatus(s.id)} style={{
                background: active ? s.color : 'transparent',
                color: active ? styles.bg : s.color,
                border: `1.5px solid ${s.color}`,
                padding: '8px 14px', fontFamily: 'Oswald, sans-serif',
                fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer'
              }}>{s.label}</button>
            );
          })}
        </div>
      </div>

      {/* Photos */}
      <ServicePhotos call={call} onSave={onSave} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <button onClick={() => setEditing(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Edit3 size={14} /> EDIT WORK ORDER
        </button>
        <button onClick={printWorkOrder} style={{
          background: styles.steel, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6
        }}>
          <FileText size={14} /> PRINT / PDF
        </button>
        <button onClick={emailWorkOrder} style={{
          background: 'none', color: styles.text, border: `1px solid ${styles.border}`,
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Mail size={14} /> EMAIL
        </button>
        <button onClick={() => { if (confirm(`Delete this service call?`)) onDelete(call.id); }} style={{
          background: 'none', color: styles.red, border: `1px solid ${styles.border}`,
          padding: '10px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', marginLeft: 'auto'
        }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ============ SERVICE CALL EDITOR ============
function ServiceCallEditor({ call, employees, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => call ? { ...call } : {
    id: `sc_${Date.now()}`,
    serviceCode: '',
    customerName: '',
    companyName: '',
    customerPhone: '',
    customerPO: '',
    address: '',
    projectName: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    status: 'upcoming',
    workReport: '',
    workEntries: [{ id: `w_${Date.now()}`, date: '', workerName: '', hours: '', materialSource: '', notes: '', parking: '' }],
    photos: [],
    totalCost: '',
    createdAt: Date.now()
  });

  const update = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const updateEntry = (id, k, v) => setDraft(prev => ({
    ...prev,
    workEntries: prev.workEntries.map(e => e.id === id ? { ...e, [k]: v } : e)
  }));
  const addEntry = () => setDraft(prev => ({
    ...prev,
    workEntries: [...prev.workEntries, { id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, date: '', workerName: '', hours: '', materialSource: '', notes: '', parking: '' }]
  }));
  const removeEntry = (id) => setDraft(prev => ({
    ...prev,
    workEntries: prev.workEntries.filter(e => e.id !== id)
  }));

  const totalHours = draft.workEntries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
  const employeeNames = employees.filter(e => e.active !== false).map(e => e.name);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <BackButton onClick={onCancel} label="Cancel" />

      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
        {call ? 'EDIT WORK ORDER' : 'NEW SERVICE CALL'}
      </div>

      {/* Customer Info */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1.5, color: styles.yellow, marginBottom: 12 }}>
          ▸ CUSTOMER & PROJECT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <Field label="Service Code (P.O #)" value={draft.serviceCode} onChange={v => update('serviceCode', v)} placeholder="S2026-48" />
          <Field label="Scheduled Date" type="date" value={draft.scheduledDate} onChange={v => update('scheduledDate', v)} />
          <Field label="Customer Name" value={draft.customerName} onChange={v => update('customerName', v)} placeholder="Suzanne Solven" />
          <Field label="Company" value={draft.companyName} onChange={v => update('companyName', v)} placeholder="Home owner" />
          <Field label="Customer Phone" value={draft.customerPhone} onChange={v => update('customerPhone', v)} placeholder="+1 (604) ..." />
          <Field label="Customer PO (their #)" value={draft.customerPO} onChange={v => update('customerPO', v)} placeholder="Optional" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Project Name" value={draft.projectName} onChange={v => update('projectName', v)} placeholder="Dishwasher hose" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Project Address" value={draft.address} onChange={v => update('address', v)} placeholder="2578 Camberley Crt." />
          </div>
        </div>
      </div>

      {/* Work Report */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1.5, color: styles.yellow, marginBottom: 12 }}>
          ▸ WORK REPORT
        </div>
        <Field
          label="Description of Work"
          value={draft.workReport}
          onChange={v => update('workReport', v)}
          multiline
          placeholder="Removed old dishwasher hose that had leaked onto tile under dishwasher. Replaced with new dishwasher hose."
        />
      </div>

      {/* Work entries (multi-row log) */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1.5, color: styles.yellow }}>
            ▸ DATES, WORKERS, HOURS, MATERIALS
          </div>
          <div style={{ fontSize: 11, color: styles.textDim }}>
            Total: <span style={{ color: styles.yellow, fontWeight: 700 }}>{totalHours}h</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {draft.workEntries.map((entry, i) => (
            <div key={entry.id} style={{ background: styles.bg, border: `1px solid ${styles.border}`, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5 }}>VISIT #{i + 1}</div>
                <button onClick={() => removeEntry(entry.id)} disabled={draft.workEntries.length === 1} style={{
                  background: 'none', border: 'none',
                  color: draft.workEntries.length === 1 ? styles.textFaint : styles.red,
                  cursor: draft.workEntries.length === 1 ? 'not-allowed' : 'pointer',
                  padding: 2
                }}><X size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <Field label="Date" type="date" value={entry.date} onChange={v => updateEntry(entry.id, 'date', v)} />
                <div>
                  <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Worker</div>
                  {employeeNames.length > 0 ? (
                    <select value={entry.workerName} onChange={e => updateEntry(entry.id, 'workerName', e.target.value)} style={{
                      width: '100%', padding: 10, background: styles.surface,
                      border: `1px solid ${styles.border}`, color: styles.text,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                    }}>
                      <option value="">— Select —</option>
                      {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
                      <option value="__custom">+ Type custom name</option>
                    </select>
                  ) : (
                    <input
                      value={entry.workerName} onChange={e => updateEntry(entry.id, 'workerName', e.target.value)}
                      placeholder="Adam"
                      style={{
                        width: '100%', padding: 10, background: styles.surface,
                        border: `1px solid ${styles.border}`, color: styles.text,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                      }}
                    />
                  )}
                </div>
                <Field label="Hours" type="number" value={entry.hours} onChange={v => updateEntry(entry.id, 'hours', v)} placeholder="1" />
                <Field
                  label="Materials"
                  value={entry.materialSource}
                  onChange={v => updateEntry(entry.id, 'materialSource', v)}
                  placeholder="Van stock: hose / Andrew Sheret - May 27"
                />
                <Field
                  label="Parking"
                  value={entry.parking}
                  onChange={v => updateEntry(entry.id, 'parking', v)}
                  placeholder="$8.50"
                />
              </div>
              {entry.notes !== undefined && (
                <div style={{ marginTop: 8 }}>
                  <Field label="Notes" value={entry.notes} onChange={v => updateEntry(entry.id, 'notes', v)} placeholder="Additional notes..." />
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addEntry} style={{
          background: 'none', color: styles.yellow, border: `1px dashed ${styles.yellow}`,
          padding: '8px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: 'pointer', marginTop: 10, width: '100%', fontWeight: 600
        }}>
          + ADD ANOTHER VISIT / DAY
        </button>
      </div>

      {/* Total */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 16, marginBottom: 16 }}>
        <Field label="Total Cost ($)" type="number" value={draft.totalCost} onChange={v => update('totalCost', v)} placeholder="50.00" />
      </div>

      {/* Save */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
          padding: '12px 20px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer'
        }}>CANCEL</button>
        <button onClick={() => onSave(draft)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '12px 20px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700
        }}>{call ? 'SAVE CHANGES' : 'CREATE WORK ORDER'}</button>
      </div>
    </div>
  );
}

// ============ SERVICE PHOTOS ============
function ServicePhotos({ call, onSave }) {
  const fileInputRef = useRef(null);
  const photos = call.photos || [];

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPhotos = await Promise.all(files.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        url: reader.result,
        caption: file.name.replace(/\.[^/.]+$/, ''),
        date: new Date().toISOString().slice(0, 10),
        addedAt: Date.now()
      });
      reader.readAsDataURL(file);
    })));
    onSave({ ...call, photos: [...newPhotos, ...photos] });
    e.target.value = '';
  };

  const removePhoto = (id) => {
    onSave({ ...call, photos: photos.filter(p => p.id !== id) });
  };

  return (
    <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 13, letterSpacing: 1.5 }}>
          PHOTOS ({photos.length})
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{
          background: styles.steel, color: styles.bg, border: 'none',
          padding: '8px 12px', fontFamily: 'Oswald, sans-serif',
          fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Camera size={14} /> ADD PHOTO
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFiles}
          style={{ display: 'none' }}
        />
      </div>
      {photos.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}`, fontSize: 12 }}>
          On phone: tap ADD PHOTO to use camera or photo library
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', background: styles.bg, border: `1px solid ${styles.border}` }}>
              <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                <img src={p.url} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 6, fontSize: 10, color: styles.textDim, lineHeight: 1.3 }}>
                <div style={{ color: styles.text, marginBottom: 2, wordBreak: 'break-word' }}>{p.caption}</div>
                <div>{p.date}</div>
              </div>
              <button onClick={() => removePhoto(p.id)} style={{
                position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)',
                border: 'none', color: styles.text, cursor: 'pointer', padding: 4
              }}><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper for printable work order
function buildPrintableWorkOrder(call) {
  const totalHours = (call.workEntries || []).reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
  const totalCost = parseFloat(call.totalCost) || 0;
  const rows = (call.workEntries || []).map(e => `
    <tr>
      <td>${e.date || ''}</td>
      <td>${e.workerName || ''}</td>
      <td style="text-align:right">${e.hours || ''}</td>
      <td>${e.materialSource || ''}${e.parking ? ' / Parking ' + e.parking : ''}</td>
    </tr>
  `).join('');
  return `<!DOCTYPE html><html><head><title>Work Order ${call.serviceCode || ''}</title>
<style>
body{font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;margin:30px;}
.header{background:#5B7B9C;color:#fff;padding:14px;font-size:24px;font-weight:700;letter-spacing:2px;text-align:center;margin-bottom:18px;}
.subhead{font-weight:700;color:#1a1a1a;letter-spacing:1px;margin-bottom:14px;}
.flex{display:flex;gap:20px;align-items:flex-start;margin-bottom:20px;}
.logo{width:120px;}
.logo img{width:100%;}
.contact{font-size:11px;color:#5B7B9C;margin-top:6px;}
.address{font-size:11px;color:#1a1a1a;margin-top:8px;font-weight:600;}
.info{font-size:13px;line-height:1.7;flex:1;}
table{width:100%;border-collapse:collapse;margin-top:10px;}
th{background:#5B7B9C;color:#fff;padding:8px;text-align:left;font-size:12px;}
th.report{width:55%;}
td{padding:6px 8px;border:1px solid #ccc;font-size:12px;vertical-align:top;}
.work-report{height:160px;}
.total{background:#f5f5f5;padding:8px;font-weight:700;border-top:2px solid #5B7B9C;}
.status{margin-top:14px;font-size:12px;color:#666;}
@media print{body{margin:15px;}}
</style></head><body>
<div class="header">WORK ORDER</div>
<div class="subhead">PMC PRESTIGE MECHANICAL CONTRACTING LTD.</div>
<div class="flex">
  <div class="logo">
    <img src="${PMC_LOGO}" alt="PMC"/>
    <div class="contact">(604) 585-1614<br>prestigemechanical@shaw.ca</div>
    <div class="address">9772 160a Street Surrey BC<br>Surrey BC, V4N 5M1</div>
  </div>
  <div class="info">
    <div>Attention: <strong>${call.customerName || '—'}</strong></div>
    <div>Company: <strong>${call.companyName || '—'}</strong></div>
    <div>Date: <strong>${call.scheduledDate || '—'}</strong></div>
    <div>P.O #: <strong>${call.serviceCode || 'S—'}</strong></div>
    <br>
    <div>Project Name: <strong>${call.projectName || '—'}</strong></div>
    <div>Customer Name: <strong>${call.customerName || '—'}</strong></div>
    <div>Customer #: <strong>${call.customerPhone || '—'}</strong></div>
    <div>Project Address: <strong>${call.address || '—'}</strong></div>
    ${call.customerPO ? `<div>Customer PO: <strong>${call.customerPO}</strong></div>` : ''}
  </div>
</div>
<table>
<tr><th class="report">Work Report</th><th>Date</th><th>Manpower</th><th>Hours</th><th>Materials/Supplier</th></tr>
<tr>
  <td class="work-report" rowspan="${Math.max(1, (call.workEntries || []).length)}" style="white-space:pre-wrap">${call.workReport || ''}</td>
  ${rows ? '' : '<td></td><td></td><td></td><td></td>'}
</tr>
${rows.split('<tr>').slice(2).map(r => '<tr>' + r).join('')}
<tr><td colspan="5" class="total">Total: $${totalCost.toFixed(2)} ${totalHours > 0 ? '· ' + totalHours + ' hours' : ''}</td></tr>
</table>
<div class="status">Status: <strong>${(call.status || 'upcoming').replace('inProgress', 'In Progress').toUpperCase()}</strong></div>
</body></html>`;
}

// ============ TIMESHEETS VIEW ============
function TimesheetsView({ timesheets, jobs, serviceCalls, employees, onSave, onDelete, onBack }) {
  const [activeId, setActiveId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const activeTs = timesheets.find(t => t.id === activeId);

  if (activeTs) {
    return (
      <TimesheetEditor
        timesheet={activeTs}
        jobs={jobs}
        serviceCalls={serviceCalls}
        employees={employees}
        onSave={onSave}
        onDelete={(id) => { onDelete(id); setActiveId(null); }}
        onBack={() => setActiveId(null)}
      />
    );
  }

  if (showNew) {
    return (
      <TimesheetEditor
        timesheet={null}
        jobs={jobs}
        serviceCalls={serviceCalls}
        employees={employees}
        onSave={(ts) => { onSave(ts); setShowNew(false); setActiveId(ts.id); }}
        onCancel={() => setShowNew(false)}
        onBack={() => setShowNew(false)}
      />
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Today" />

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={28} color={styles.yellow} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>TIMESHEETS</div>
            <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              BI-WEEKLY · {timesheets.length} ON FILE
            </div>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '12px 18px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
          fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Plus size={14} strokeWidth={3} /> NEW TIMESHEET
        </button>
      </div>

      {timesheets.length === 0 ? (
        <div style={{
          border: `2px dashed ${styles.border}`, padding: 40, textAlign: 'center',
          background: styles.surface
        }}>
          <Clock size={40} color={styles.textFaint} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, color: styles.textDim, marginBottom: 12 }}>NO TIMESHEETS YET</div>
          <button onClick={() => setShowNew(true)} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
            fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
          }}>+ START FIRST TIMESHEET</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {timesheets.map(ts => (
            <div key={ts.id} onClick={() => setActiveId(ts.id)} style={{
              background: styles.surface, border: `1px solid ${styles.border}`,
              borderLeft: `4px solid ${ts.approved ? styles.green : styles.yellow}`,
              padding: 14, cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, fontWeight: 700 }}>{ts.employeeName || 'Unnamed'}</div>
                  <div style={{ fontSize: 11, color: styles.textDim, marginTop: 4 }}>
                    Period ending {ts.weekEnding || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: styles.yellow, fontWeight: 700 }}>
                    {ts.totalHours || 0}h
                  </div>
                  <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1 }}>
                    {ts.approved ? '✓ APPROVED' : 'DRAFT'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ TIMESHEET EDITOR ============
// Bi-weekly format matching PMC's existing Excel structure:
// Saturday-week-ending date, S/M/T/W/T/F days × 2 weeks = 14 day columns
// Rows = job codes; bottom = day totals; right = row totals; final = grand total
// Hours split: Reg / OT / Double Time per day per job
function TimesheetEditor({ timesheet, jobs, serviceCalls, employees, onSave, onDelete, onBack, onCancel }) {
  const [draft, setDraft] = useState(() => {
    if (timesheet) return { ...timesheet };
    // Default: current pay period ending this Saturday
    const today = new Date();
    const daysUntilSat = (6 - today.getDay() + 7) % 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysUntilSat);
    const week2End = sat.toISOString().slice(0, 10);
    const week1End = new Date(sat.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    return {
      id: `ts_${Date.now()}`,
      employeeName: '',
      weekEnding: week2End,
      week1Ending: week1End,
      week2Ending: week2End,
      rows: [{ id: `r_${Date.now()}`, jobCode: '', jobName: '', hours: Array(14).fill(null).map(() => ({ reg: '', ot: '', dt: '' })) }],
      approved: false,
      notes: '',
      createdAt: Date.now(),
      totalHours: 0
    };
  });

  // Build a list of all available "jobs" (contract jobs + service calls)
  const allJobOptions = [
    ...jobs.map(j => ({ code: j.jobNumber || j.id, label: `${j.jobNumber || '?'} — ${j.jobName}`, type: 'contract' })),
    ...serviceCalls.map(s => ({ code: s.serviceCode || s.id, label: `${s.serviceCode || 'S?'} — ${s.projectName || s.customerName || 'Service'}`, type: 'service' }))
  ];

  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday
  const employeeNames = employees.filter(e => e.active !== false).map(e => e.name);

  const addRow = () => {
    setDraft(prev => ({
      ...prev,
      rows: [...prev.rows, { id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, jobCode: '', jobName: '', hours: Array(14).fill(null).map(() => ({ reg: '', ot: '', dt: '' })) }]
    }));
  };

  const removeRow = (id) => {
    if (draft.rows.length === 1) return;
    setDraft(prev => ({ ...prev, rows: prev.rows.filter(r => r.id !== id) }));
  };

  const updateRow = (id, k, v) => {
    setDraft(prev => ({ ...prev, rows: prev.rows.map(r => r.id === id ? { ...r, [k]: v } : r) }));
  };

  const updateHours = (rowId, dayIdx, kind, v) => {
    setDraft(prev => ({
      ...prev,
      rows: prev.rows.map(r => {
        if (r.id !== rowId) return r;
        const newHours = [...r.hours];
        newHours[dayIdx] = { ...newHours[dayIdx], [kind]: v };
        return { ...r, hours: newHours };
      })
    }));
  };

  const setJobFromOption = (rowId, code) => {
    if (!code) {
      updateRow(rowId, 'jobCode', '');
      updateRow(rowId, 'jobName', '');
      return;
    }
    const opt = allJobOptions.find(o => o.code === code);
    setDraft(prev => ({
      ...prev,
      rows: prev.rows.map(r => r.id === rowId ? { ...r, jobCode: code, jobName: opt?.label?.split('—')[1]?.trim() || '' } : r)
    }));
  };

  // Calculations
  const sumDay = (dayHrs) => (parseFloat(dayHrs.reg) || 0) + (parseFloat(dayHrs.ot) || 0) + (parseFloat(dayHrs.dt) || 0);
  const rowTotal = (row) => row.hours.reduce((s, h) => s + sumDay(h), 0);
  const dayTotal = (dayIdx) => draft.rows.reduce((s, r) => s + sumDay(r.hours[dayIdx]), 0);
  const week1Total = () => draft.rows.reduce((s, r) => s + r.hours.slice(0, 7).reduce((s2, h) => s2 + sumDay(h), 0), 0);
  const week2Total = () => draft.rows.reduce((s, r) => s + r.hours.slice(7, 14).reduce((s2, h) => s2 + sumDay(h), 0), 0);
  const grandTotal = () => week1Total() + week2Total();

  // Reg / OT / DT totals
  const sumKind = (kind) => draft.rows.reduce((s, r) =>
    s + r.hours.reduce((s2, h) => s2 + (parseFloat(h[kind]) || 0), 0), 0);

  const handleSave = () => {
    onSave({ ...draft, totalHours: grandTotal() });
  };

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <BackButton onClick={onBack || onCancel} label={timesheet ? 'Timesheets' : 'Cancel'} />

      {/* Letterhead matching the PMC Excel timesheet */}
      <div style={{ background: '#fff', color: '#1a1a1a', padding: 16, marginBottom: 16, border: `1px solid ${styles.borderLight}` }}>
        <div style={{ textAlign: 'center', fontFamily: 'Times New Roman, serif', fontSize: 22, fontWeight: 700, marginBottom: 14, color: '#1a1a1a' }}>
          TIME SHEET
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center', borderBottom: `1px solid #ccc`, paddingBottom: 12 }}>
          <img src={PMC_LOGO} alt="PMC" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', fontWeight: 700, color: '#1a1a1a', fontSize: 13 }}>
            PMC PRESTIGE MECHANICAL CONTRACTING LTD.
          </div>
          <div style={{ fontSize: 10, color: '#1a1a1a', textAlign: 'right', lineHeight: 1.4 }}>
            9772 160A Street<br />
            Surrey, BC V4N 5M1<br />
            Telephone: (604) 585-1614<br />
            Facsimile: (604) 585-1714
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <span style={{ color: '#1a1a1a', fontWeight: 700, marginRight: 8 }}>NAME:</span>
          {employeeNames.length > 0 ? (
            <select value={draft.employeeName} onChange={e => setDraft(prev => ({ ...prev, employeeName: e.target.value }))} style={{
              padding: '4px 8px', border: '1px solid #ccc', fontSize: 13, color: '#1a1a1a', background: '#fff'
            }}>
              <option value="">— Select —</option>
              {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input value={draft.employeeName} onChange={e => setDraft(prev => ({ ...prev, employeeName: e.target.value }))} placeholder="Employee name" style={{
              padding: '4px 8px', border: '1px solid #ccc', fontSize: 13, color: '#1a1a1a', minWidth: 200, background: '#fff'
            }} />
          )}
          <span style={{ marginLeft: 24, color: '#1a1a1a', fontWeight: 700, marginRight: 8 }}>WK 1 ENDING:</span>
          <input type="date" value={draft.week1Ending} onChange={e => setDraft(prev => ({ ...prev, week1Ending: e.target.value }))} style={{
            padding: '4px 8px', border: '1px solid #ccc', fontSize: 13, color: '#1a1a1a', background: '#fff'
          }} />
          <span style={{ marginLeft: 12, color: '#1a1a1a', fontWeight: 700, marginRight: 8 }}>WK 2 ENDING:</span>
          <input type="date" value={draft.week2Ending} onChange={e => setDraft(prev => ({ ...prev, week2Ending: e.target.value, weekEnding: e.target.value }))} style={{
            padding: '4px 8px', border: '1px solid #ccc', fontSize: 13, color: '#1a1a1a', background: '#fff'
          }} />
        </div>
      </div>

      {/* Timesheet grid */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 8 }}>
          ENTER REG / OT / DT HOURS PER DAY · TAP CELL TO EDIT
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, minWidth: 900 }}>
          <thead>
            <tr style={{ background: styles.bg }}>
              <th style={{ padding: 6, border: `1px solid ${styles.border}`, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, color: styles.yellow, textAlign: 'left', minWidth: 140 }}>JOB CODE</th>
              <th colSpan={7} style={{ padding: 6, border: `1px solid ${styles.border}`, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, color: styles.steel, textAlign: 'center' }}>
                WEEK 1 — ENDING {draft.week1Ending || '?'}
              </th>
              <th colSpan={7} style={{ padding: 6, border: `1px solid ${styles.border}`, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, color: styles.steel, textAlign: 'center' }}>
                WEEK 2 — ENDING {draft.week2Ending || '?'}
              </th>
              <th style={{ padding: 6, border: `1px solid ${styles.border}`, fontFamily: 'Oswald, sans-serif', letterSpacing: 1, color: styles.yellow, textAlign: 'center' }}>TOTAL</th>
              <th style={{ padding: 4, border: `1px solid ${styles.border}` }}></th>
            </tr>
            <tr style={{ background: styles.bg }}>
              <th style={{ padding: 4, border: `1px solid ${styles.border}` }}></th>
              {[...dayHeaders, ...dayHeaders].map((d, i) => (
                <th key={i} style={{
                  padding: 4, border: `1px solid ${styles.border}`,
                  fontFamily: 'Oswald, sans-serif', fontSize: 11,
                  color: styles.text, textAlign: 'center', minWidth: 60,
                  background: i === 6 || i === 13 ? styles.surfaceLight : styles.bg
                }}>{d}</th>
              ))}
              <th style={{ padding: 4, border: `1px solid ${styles.border}`, color: styles.yellow }}></th>
              <th style={{ padding: 4, border: `1px solid ${styles.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map(row => (
              <tr key={row.id}>
                <td style={{ padding: 4, border: `1px solid ${styles.border}`, verticalAlign: 'top' }}>
                  {allJobOptions.length > 0 ? (
                    <select value={row.jobCode} onChange={e => setJobFromOption(row.id, e.target.value)} style={{
                      width: '100%', padding: 4, background: styles.bg,
                      border: `1px solid ${styles.borderLight}`, color: styles.text,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, outline: 'none'
                    }}>
                      <option value="">— Select job —</option>
                      <optgroup label="Contract Jobs">
                        {allJobOptions.filter(o => o.type === 'contract').map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                      </optgroup>
                      <optgroup label="Service Calls">
                        {allJobOptions.filter(o => o.type === 'service').map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
                      </optgroup>
                    </select>
                  ) : (
                    <input value={row.jobCode} onChange={e => updateRow(row.id, 'jobCode', e.target.value)} placeholder="M2026-XX" style={{
                      width: '100%', padding: 4, background: styles.bg,
                      border: `1px solid ${styles.borderLight}`, color: styles.text,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, outline: 'none'
                    }} />
                  )}
                  {row.jobName && (
                    <div style={{ fontSize: 9, color: styles.textDim, marginTop: 2, padding: '0 2px' }}>{row.jobName}</div>
                  )}
                </td>
                {row.hours.map((h, dayIdx) => (
                  <td key={dayIdx} style={{
                    padding: 0, border: `1px solid ${styles.border}`,
                    background: dayIdx === 6 || dayIdx === 13 ? styles.surfaceLight : 'transparent'
                  }}>
                    <HourCell
                      hours={h}
                      onChange={(kind, v) => updateHours(row.id, dayIdx, kind, v)}
                    />
                  </td>
                ))}
                <td style={{ padding: 6, border: `1px solid ${styles.border}`, textAlign: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, color: styles.yellow, background: styles.bg }}>
                  {rowTotal(row).toFixed(1).replace(/\.0$/, '')}
                </td>
                <td style={{ padding: 2, border: `1px solid ${styles.border}`, textAlign: 'center' }}>
                  <button onClick={() => removeRow(row.id)} disabled={draft.rows.length === 1} style={{
                    background: 'none', border: 'none',
                    color: draft.rows.length === 1 ? styles.textFaint : styles.red,
                    cursor: draft.rows.length === 1 ? 'not-allowed' : 'pointer'
                  }}><X size={14} /></button>
                </td>
              </tr>
            ))}

            {/* Day totals row */}
            <tr style={{ background: styles.bg }}>
              <td style={{ padding: 6, border: `1px solid ${styles.border}`, fontFamily: 'Oswald, sans-serif', fontSize: 12, color: styles.yellow, fontWeight: 700, letterSpacing: 1 }}>
                DAY TOTAL
              </td>
              {Array(14).fill(0).map((_, dayIdx) => {
                const dt = dayTotal(dayIdx);
                return (
                  <td key={dayIdx} style={{
                    padding: 6, border: `1px solid ${styles.border}`,
                    textAlign: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 13, fontWeight: 700,
                    color: dt > 0 ? styles.text : styles.textFaint,
                    background: dayIdx === 6 || dayIdx === 13 ? styles.surfaceLight : 'transparent'
                  }}>
                    {dt > 0 ? dt.toFixed(1).replace(/\.0$/, '') : '0'}
                  </td>
                );
              })}
              <td style={{ padding: 6, border: `1px solid ${styles.border}`, textAlign: 'center', fontFamily: 'Oswald, sans-serif', fontSize: 18, fontWeight: 700, color: styles.yellow, background: styles.surfaceLight }}>
                {grandTotal().toFixed(1).replace(/\.0$/, '')}
              </td>
              <td style={{ padding: 4, border: `1px solid ${styles.border}` }}></td>
            </tr>
          </tbody>
        </table>

        <button onClick={addRow} style={{
          background: 'none', color: styles.yellow, border: `1px dashed ${styles.yellow}`,
          padding: '8px 12px', fontFamily: 'Oswald, sans-serif', fontSize: 11, letterSpacing: 1.5,
          cursor: 'pointer', marginTop: 10, fontWeight: 600
        }}>
          + ADD JOB ROW
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <SummaryBlock label="WEEK 1" value={week1Total().toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.text} />
        <SummaryBlock label="WEEK 2" value={week2Total().toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.text} />
        <SummaryBlock label="REGULAR" value={sumKind('reg').toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.steel} />
        <SummaryBlock label="OVERTIME" value={sumKind('ot').toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.orange} />
        <SummaryBlock label="DOUBLE TIME" value={sumKind('dt').toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.red} />
        <SummaryBlock label="GRAND TOTAL" value={grandTotal().toFixed(1).replace(/\.0$/, '') + 'h'} color={styles.yellow} />
      </div>

      {/* Notes & approval */}
      <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 12, marginBottom: 16 }}>
        <Field label="Notes" value={draft.notes} onChange={v => setDraft(prev => ({ ...prev, notes: v }))} multiline placeholder="Sick, vacation, special circumstances..." />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 12 }}>
          <input type="checkbox" checked={!!draft.approved} onChange={e => setDraft(prev => ({ ...prev, approved: e.target.checked, approvedAt: e.target.checked ? Date.now() : null }))} />
          <span>Approved {draft.approvedAt && `(${new Date(draft.approvedAt).toLocaleDateString('en-CA')})`}</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {timesheet && (
          <button onClick={() => { if (confirm('Delete this timesheet?')) onDelete(timesheet.id); }} style={{
            background: 'none', color: styles.red, border: `1px solid ${styles.border}`,
            padding: '12px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
          }}>DELETE</button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onCancel || onBack} style={{
          background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
          padding: '12px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, cursor: 'pointer'
        }}>CANCEL</button>
        <button onClick={handleSave} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '12px 20px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700
        }}>SAVE TIMESHEET</button>
      </div>
    </div>
  );
}

function HourCell({ hours, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const total = (parseFloat(hours.reg) || 0) + (parseFloat(hours.ot) || 0) + (parseFloat(hours.dt) || 0);

  if (!expanded && total === 0) {
    return (
      <div onClick={() => setExpanded(true)} style={{
        padding: 8, textAlign: 'center', cursor: 'pointer', minHeight: 32,
        color: styles.textFaint, fontSize: 12
      }}>
        —
      </div>
    );
  }

  return (
    <div onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', padding: 4 }}>
      {expanded ? (
        <div style={{ display: 'grid', gap: 2 }} onClick={e => e.stopPropagation()}>
          <input
            type="number" step="0.25" placeholder="R"
            value={hours.reg} onChange={e => onChange('reg', e.target.value)}
            title="Regular hours"
            style={{
              width: '100%', padding: 3, fontSize: 11,
              background: styles.bg, border: `1px solid ${styles.steelDark}`,
              color: styles.steel, textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace'
            }}
          />
          <input
            type="number" step="0.25" placeholder="OT"
            value={hours.ot} onChange={e => onChange('ot', e.target.value)}
            title="Overtime"
            style={{
              width: '100%', padding: 3, fontSize: 11,
              background: styles.bg, border: `1px solid ${styles.orange}`,
              color: styles.orange, textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace'
            }}
          />
          <input
            type="number" step="0.25" placeholder="DT"
            value={hours.dt} onChange={e => onChange('dt', e.target.value)}
            title="Double time"
            style={{
              width: '100%', padding: 3, fontSize: 11,
              background: styles.bg, border: `1px solid ${styles.red}`,
              color: styles.red, textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace'
            }}
          />
          <button onClick={() => setExpanded(false)} style={{
            background: 'none', border: 'none', color: styles.textDim, fontSize: 9, cursor: 'pointer', padding: 2
          }}>collapse</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 4, fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 700, color: styles.text }}>
          {total.toFixed(1).replace(/\.0$/, '')}
          {(hours.ot || hours.dt) && (
            <div style={{ fontSize: 8, marginTop: 2 }}>
              {hours.reg && <span style={{ color: styles.steel }}>R{hours.reg} </span>}
              {hours.ot && <span style={{ color: styles.orange }}>OT{hours.ot} </span>}
              {hours.dt && <span style={{ color: styles.red }}>DT{hours.dt}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryBlock({ label, value, color }) {
  return (
    <div style={{ background: styles.surface, border: `1px solid ${styles.border}`, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: styles.textDim, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, color: color, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ============ EMPLOYEES VIEW (master crew list) ============
function EmployeesView({ employees, onSave, onBack }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', role: '', phone: '', email: '', active: true });

  const ROLES = ['Owner', 'PM', 'Superintendent', 'Foreman', 'Journeyman', 'Apprentice', 'Office', 'Service Tech'];

  const add = () => {
    if (!draft.name.trim()) return;
    onSave([{ id: `emp_${Date.now()}`, ...draft, name: draft.name.trim(), addedAt: Date.now() }, ...employees]);
    setDraft({ name: '', role: '', phone: '', email: '', active: true });
    setAdding(false);
  };

  const update = (id, changes) => {
    onSave(employees.map(e => e.id === id ? { ...e, ...changes } : e));
  };

  const remove = (emp) => {
    if (!confirm(`Remove ${emp.name} from crew list?`)) return;
    onSave(employees.filter(e => e.id !== emp.id));
  };

  const downloadVCard = (emp) => {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${emp.name}`,
      `N:${emp.name};;;;`,
      emp.role && `TITLE:${emp.role}`,
      'ORG:Prestige Mechanical Contracting',
      emp.phone && `TEL;TYPE=CELL:${emp.phone}`,
      emp.email && `EMAIL:${emp.email}`,
      'END:VCARD'
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([lines], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${emp.name}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const active = employees.filter(e => e.active !== false);
  const inactive = employees.filter(e => e.active === false);

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Today" />

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <User size={28} color={styles.yellow} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>PMC CREW</div>
            <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              {active.length} ACTIVE · USED FOR TASK ASSIGNMENT, TIMESHEETS, NOTIFICATIONS
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: styles.surface, border: `1px solid ${styles.steel}`,
        borderLeft: `4px solid ${styles.steel}`,
        padding: 12, marginBottom: 16, fontSize: 12, color: styles.text, lineHeight: 1.5
      }}>
        Add everyone on PMC's crew here. Names appear in dropdowns when assigning tasks, filling timesheets, and recording who dropped off tools. In Phase 2, each will get a login.
      </div>

      {!adding ? (
        <button onClick={() => setAdding(true)} style={{
          background: styles.yellow, color: styles.bg, border: 'none',
          padding: '10px 16px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
          cursor: 'pointer', fontWeight: 700, marginBottom: 16
        }}>+ ADD EMPLOYEE</button>
      ) : (
        <div style={{ background: styles.surface, border: `2px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <Field label="Name *" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} placeholder="Mike Smith" />
            <div>
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Role</div>
              <select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} style={{
                width: '100%', padding: 10, background: styles.bg,
                border: `1px solid ${styles.border}`, color: styles.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
              }}>
                <option value="">— Select role —</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Field label="Phone" value={draft.phone} onChange={v => setDraft({ ...draft, phone: v })} placeholder="604-..." />
            <Field label="Email" value={draft.email} onChange={v => setDraft({ ...draft, email: v })} placeholder="name@pmcmech.ca" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={add} disabled={!draft.name.trim()} style={{
              background: draft.name.trim() ? styles.yellow : styles.surfaceLight,
              color: draft.name.trim() ? styles.bg : styles.textFaint,
              border: 'none', padding: '8px 14px',
              fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11,
              cursor: draft.name.trim() ? 'pointer' : 'not-allowed', fontWeight: 700
            }}>SAVE</button>
            <button onClick={() => { setAdding(false); setDraft({ name: '', role: '', phone: '', email: '', active: true }); }} style={{
              background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
              padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer'
            }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Active list */}
      {active.length === 0 && !adding ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <User size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No employees yet — add your crew</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {active.map(emp => (
            <EmployeeRow key={emp.id} emp={emp}
              editing={editingId === emp.id}
              onEdit={() => setEditingId(emp.id)}
              onDoneEdit={() => setEditingId(null)}
              onUpdate={(c) => update(emp.id, c)}
              onDelete={() => remove(emp)}
              onSaveContact={() => downloadVCard(emp)}
              onToggleActive={() => update(emp.id, { active: false })}
              ROLES={ROLES}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5, color: styles.textDim, marginBottom: 8 }}>
            ▸ INACTIVE ({inactive.length})
          </summary>
          <div style={{ display: 'grid', gap: 6 }}>
            {inactive.map(emp => (
              <div key={emp.id} style={{
                background: styles.surface, border: `1px solid ${styles.border}`,
                padding: 10, opacity: 0.55, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.name}</div>
                  <div style={{ fontSize: 10, color: styles.textDim }}>{emp.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => update(emp.id, { active: true })} style={{
                    background: 'none', border: `1px solid ${styles.green}`, color: styles.green,
                    padding: '4px 10px', cursor: 'pointer', fontFamily: 'Oswald, sans-serif',
                    fontSize: 9, letterSpacing: 1, fontWeight: 700
                  }}>REACTIVATE</button>
                  <button onClick={() => remove(emp)} style={{
                    background: 'none', border: 'none', color: styles.textFaint, cursor: 'pointer'
                  }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EmployeeRow({ emp, editing, onEdit, onDoneEdit, onUpdate, onDelete, onSaveContact, onToggleActive, ROLES }) {
  const initials = emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div style={{
      background: styles.surface, border: `1px solid ${styles.border}`,
      borderLeft: `4px solid ${styles.yellow}`, padding: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, background: styles.yellow, color: styles.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Oswald, sans-serif', fontWeight: 700, fontSize: 14, flexShrink: 0
        }}>{initials}</div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <Field label="Name" value={emp.name} onChange={v => onUpdate({ name: v })} />
              <div>
                <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Role</div>
                <select value={emp.role || ''} onChange={e => onUpdate({ role: e.target.value })} style={{
                  width: '100%', padding: 10, background: styles.bg,
                  border: `1px solid ${styles.border}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                }}>
                  <option value="">—</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <Field label="Phone" value={emp.phone} onChange={v => onUpdate({ phone: v })} />
              <Field label="Email" value={emp.email} onChange={v => onUpdate({ email: v })} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{emp.name}</div>
              {emp.role && <div style={{ fontSize: 10, color: styles.yellow, letterSpacing: 1, marginTop: 2 }}>{emp.role.toUpperCase()}</div>}
              <div style={{ marginTop: 6 }}>
                {emp.phone && (
                  <a href={`tel:${emp.phone.replace(/\s/g, '')}`} style={{
                    fontSize: 12, color: styles.text, display: 'inline-flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none', marginRight: 16
                  }}>
                    <Phone size={11} color={styles.steel} />
                    <span style={{ borderBottom: `1px dashed ${styles.steelDark}` }}>{emp.phone}</span>
                  </a>
                )}
                {emp.email && (
                  <a href={`mailto:${emp.email}`} style={{
                    fontSize: 11, color: styles.text, display: 'inline-flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none'
                  }}>
                    <Mail size={11} color={styles.steel} />
                    <span style={{ borderBottom: `1px dashed ${styles.steelDark}`, wordBreak: 'break-all' }}>{emp.email}</span>
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {editing ? (
            <button onClick={onDoneEdit} style={{
              background: styles.yellow, color: styles.bg, border: 'none',
              padding: '4px 10px', fontFamily: 'Oswald, sans-serif',
              fontSize: 9, letterSpacing: 1, fontWeight: 700, cursor: 'pointer'
            }}>DONE</button>
          ) : (
            <>
              <button onClick={onSaveContact} title="Save to iPhone Contacts" style={{
                background: styles.steel, color: styles.bg, border: 'none',
                padding: '4px 8px', fontFamily: 'Oswald, sans-serif',
                fontSize: 9, letterSpacing: 1, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 3
              }}>
                <User size={9} /> SAVE
              </button>
              <button onClick={onEdit} title="Edit" style={{
                background: 'none', border: `1px solid ${styles.border}`, color: styles.textDim,
                padding: '4px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}><Edit3 size={11} /></button>
              <button onClick={onToggleActive} title="Mark inactive" style={{
                background: 'none', border: `1px solid ${styles.border}`, color: styles.textFaint,
                padding: '4px 8px', cursor: 'pointer', fontSize: 9, letterSpacing: 0.5,
                fontFamily: 'Oswald, sans-serif'
              }}>HIDE</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ SCHEDULE VIEW ============
// Top-level company schedule: holidays, booked-off days, company events
function ScheduleView({ events, employees, onSave, onBack }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // upcoming | all | past
  const [draft, setDraft] = useState(blankEvent());

  function blankEvent() {
    return {
      title: '',
      type: 'event',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      who: '',
      notes: ''
    };
  }

  const employeeNames = (employees || []).filter(e => e.active !== false).map(e => e.name);

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr);

  const add = () => {
    if (!draft.title.trim() || !draft.startDate) return;
    const newEvent = { id: `ev_${Date.now()}`, ...draft, title: draft.title.trim(), createdAt: Date.now() };
    onSave([newEvent, ...events]);
    setDraft(blankEvent());
    setAdding(false);
  };

  const update = (id, changes) => onSave(events.map(e => e.id === id ? { ...e, ...changes } : e));
  const remove = (e) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    onSave(events.filter(ev => ev.id !== e.id));
  };

  const eventTypes = [
    { id: 'holiday', label: 'Stat Holiday', color: styles.green, icon: '🎉' },
    { id: 'vacation', label: 'Vacation / Time Off', color: styles.steel, icon: '🏖' },
    { id: 'dayoff', label: 'Day Off', color: styles.orange, icon: '🏠' },
    { id: 'event', label: 'Company Event', color: styles.yellow, icon: '🛠' }
  ];

  const filtered = events.filter(e => {
    if (!e.startDate) return filter === 'all';
    const d = new Date(e.endDate || e.startDate);
    if (filter === 'upcoming') return d >= today;
    if (filter === 'past') return d < today;
    return true;
  }).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

  // Group by month for the upcoming view
  const grouped = {};
  filtered.forEach(e => {
    if (!e.startDate) return;
    const d = new Date(e.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }).toUpperCase();
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(e);
  });
  const monthKeys = Object.keys(grouped).sort(filter === 'past' ? (a, b) => b.localeCompare(a) : undefined);

  const counts = {
    upcoming: events.filter(e => e.startDate && new Date(e.endDate || e.startDate) >= today).length,
    past: events.filter(e => e.startDate && new Date(e.endDate || e.startDate) < today).length,
    all: events.length
  };

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Today" />

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={28} color={styles.steel} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>COMPANY SCHEDULE</div>
            <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              HOLIDAYS · TIME OFF · COMPANY EVENTS · {counts.upcoming} UPCOMING
            </div>
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            background: styles.steel, color: styles.bg, border: 'none',
            padding: '12px 18px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
            fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Plus size={14} strokeWidth={3} /> ADD EVENT
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}` }}>
        {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }, { id: 'all', label: 'All' }].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'none', border: 'none',
              color: active ? styles.yellow : styles.textDim,
              padding: '10px 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? styles.yellow : 'transparent'}`,
              fontWeight: 600
            }}>
              {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.6 }}>({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: styles.surface, border: `2px solid ${styles.steel}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, marginBottom: 12, color: styles.steel }}>
            NEW EVENT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Title *" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} placeholder="Christmas Day, Mike vacation, Truck inspection..." />
            </div>
            <div>
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Type</div>
              <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} style={{
                width: '100%', padding: 10, background: styles.bg,
                border: `1px solid ${styles.border}`, color: styles.text,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
              }}>
                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <Field label="Start Date *" type="date" value={draft.startDate} onChange={v => setDraft({ ...draft, startDate: v })} />
            <Field label="End Date (optional)" type="date" value={draft.endDate} onChange={v => setDraft({ ...draft, endDate: v })} />
            {(draft.type === 'vacation' || draft.type === 'dayoff') && (
              <div>
                <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Who</div>
                {employeeNames.length > 0 ? (
                  <select value={draft.who} onChange={e => setDraft({ ...draft, who: e.target.value })} style={{
                    width: '100%', padding: 10, background: styles.bg,
                    border: `1px solid ${styles.border}`, color: styles.text,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                  }}>
                    <option value="">— Select —</option>
                    {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                ) : (
                  <input value={draft.who} onChange={e => setDraft({ ...draft, who: e.target.value })} placeholder="Employee name" style={{
                    width: '100%', padding: 10, background: styles.bg,
                    border: `1px solid ${styles.border}`, color: styles.text,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                  }} />
                )}
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Notes" value={draft.notes} onChange={v => setDraft({ ...draft, notes: v })} multiline placeholder="Optional details" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={add} disabled={!draft.title.trim() || !draft.startDate} style={{
              background: (draft.title.trim() && draft.startDate) ? styles.yellow : styles.surfaceLight,
              color: (draft.title.trim() && draft.startDate) ? styles.bg : styles.textFaint,
              border: 'none', padding: '8px 14px',
              fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11,
              cursor: (draft.title.trim() && draft.startDate) ? 'pointer' : 'not-allowed', fontWeight: 700
            }}>SAVE EVENT</button>
            <button onClick={() => { setAdding(false); setDraft(blankEvent()); }} style={{
              background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
              padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer'
            }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Events grouped by month */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <Calendar size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No {filter === 'all' ? '' : filter} events</div>
        </div>
      ) : (
        monthKeys.map(key => {
          const group = grouped[key];
          return (
            <div key={key} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ height: 1, background: styles.border, flex: 1 }} />
                <div style={{ fontSize: 11, color: styles.yellow, letterSpacing: 1.5, fontFamily: 'Oswald, sans-serif', fontWeight: 600 }}>{group.label}</div>
                <div style={{ height: 1, background: styles.border, flex: 1 }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {group.items.map(e => {
                  const type = eventTypes.find(t => t.id === e.type) || eventTypes[3];
                  const editing = editingId === e.id;
                  const d = new Date(e.startDate);
                  const days = Math.round((d - today) / 86400000);
                  let dayLabel = '';
                  if (days === 0) dayLabel = 'TODAY';
                  else if (days === 1) dayLabel = 'TOMORROW';
                  else if (days > 0 && days <= 14) dayLabel = `IN ${days}D`;
                  else if (days < 0 && days >= -7) dayLabel = `${Math.abs(days)}D AGO`;
                  return (
                    <div key={e.id} style={{
                      background: styles.surface, border: `1px solid ${styles.border}`,
                      borderLeft: `4px solid ${type.color}`, padding: 12
                    }}>
                      {editing ? (
                        <div>
                          <Field label="Title" value={e.title} onChange={v => update(e.id, { title: v })} />
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Type</div>
                              <select value={e.type} onChange={ev => update(e.id, { type: ev.target.value })} style={{
                                width: '100%', padding: 10, background: styles.bg,
                                border: `1px solid ${styles.border}`, color: styles.text,
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                              }}>
                                {eventTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                              </select>
                            </div>
                            <Field label="Start" type="date" value={e.startDate} onChange={v => update(e.id, { startDate: v })} />
                            <Field label="End" type="date" value={e.endDate} onChange={v => update(e.id, { endDate: v })} />
                            <Field label="Who" value={e.who} onChange={v => update(e.id, { who: v })} />
                          </div>
                          <Field label="Notes" value={e.notes} onChange={v => update(e.id, { notes: v })} multiline />
                          <button onClick={() => setEditingId(null)} style={{
                            background: styles.yellow, color: styles.bg, border: 'none',
                            padding: '6px 14px', marginTop: 6, fontFamily: 'Oswald, sans-serif',
                            fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer'
                          }}>DONE</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 16 }}>{type.icon}</span>
                              <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 15, fontWeight: 600 }}>{e.title}</span>
                              <span style={{ fontSize: 9, color: type.color, letterSpacing: 1, fontWeight: 700 }}>{type.label.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 11, color: styles.textDim, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              <span>📅 {e.startDate}{e.endDate && e.endDate !== e.startDate && ` → ${e.endDate}`}</span>
                              {e.who && <span>👤 {e.who}</span>}
                            </div>
                            {e.notes && <div style={{ fontSize: 11, color: styles.textDim, marginTop: 6, fontStyle: 'italic' }}>{e.notes}</div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                            {dayLabel && (
                              <div style={{ fontSize: 9, color: type.color, letterSpacing: 1, fontWeight: 700 }}>{dayLabel}</div>
                            )}
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => setEditingId(e.id)} style={{
                                background: 'none', border: `1px solid ${styles.border}`, color: styles.textDim,
                                padding: 4, cursor: 'pointer', display: 'flex'
                              }}><Edit3 size={11} /></button>
                              <button onClick={() => remove(e)} style={{
                                background: 'none', border: `1px solid ${styles.border}`, color: styles.textFaint,
                                padding: 4, cursor: 'pointer', display: 'flex'
                              }}><Trash2 size={11} /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* BC Stat holidays helper */}
      {events.length === 0 && filter === 'upcoming' && !adding && (
        <BCStatHolidaysHelper onAdd={(holiday) => onSave([{ id: `ev_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, ...holiday, createdAt: Date.now() }, ...events])} />
      )}
    </div>
  );
}

function BCStatHolidaysHelper({ onAdd }) {
  // BC stat holidays for the next 12 months — added by quick button
  const year = new Date().getFullYear();
  const holidays = [
    { date: `${year}-01-01`, title: "New Year's Day" },
    { date: `${year}-02-19`, title: 'Family Day (BC)' }, // 3rd Monday in Feb — approximate
    { date: `${year}-04-18`, title: 'Good Friday' }, // approx
    { date: `${year}-05-19`, title: 'Victoria Day' },
    { date: `${year}-07-01`, title: 'Canada Day' },
    { date: `${year}-08-04`, title: 'BC Day' },
    { date: `${year}-09-01`, title: 'Labour Day' },
    { date: `${year}-09-30`, title: 'National Day for Truth and Reconciliation' },
    { date: `${year}-10-13`, title: 'Thanksgiving' },
    { date: `${year}-11-11`, title: 'Remembrance Day' },
    { date: `${year}-12-25`, title: 'Christmas Day' }
  ];
  return (
    <div style={{ marginTop: 24, padding: 14, background: styles.surface, border: `1px dashed ${styles.borderLight}` }}>
      <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1.5, marginBottom: 10 }}>
        QUICK ADD: BC STAT HOLIDAYS {year}
      </div>
      <div style={{ fontSize: 11, color: styles.textFaint, marginBottom: 10, fontStyle: 'italic' }}>
        Approximate dates — verify against current year and your collective agreement.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {holidays.map(h => (
          <button key={h.date} onClick={() => onAdd({ title: h.title, type: 'holiday', startDate: h.date, endDate: '', who: '', notes: '' })} style={{
            background: 'none', border: `1px solid ${styles.border}`, color: styles.text,
            padding: '6px 10px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
            cursor: 'pointer'
          }}>+ {h.title}</button>
        ))}
      </div>
    </div>
  );
}

// ============ BULLETIN BOARD VIEW ============
// Top-level reminders board: Matt posts, crew sees on Today view
function BulletinView({ posts, employees, onSave, onBack }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('active'); // active | archived | all
  const [draft, setDraft] = useState({ title: '', body: '', author: '', pinned: false });

  const employeeNames = (employees || []).filter(e => e.active !== false).map(e => e.name);

  const add = () => {
    if (!draft.title.trim()) return;
    const newPost = { id: `bp_${Date.now()}`, ...draft, title: draft.title.trim(), at: Date.now(), archived: false };
    onSave([newPost, ...posts]);
    setDraft({ title: '', body: '', author: '', pinned: false });
    setAdding(false);
  };

  const update = (id, changes) => onSave(posts.map(p => p.id === id ? { ...p, ...changes } : p));
  const remove = (p) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    onSave(posts.filter(post => post.id !== p.id));
  };

  const filtered = posts.filter(p => {
    if (filter === 'active') return !p.archived;
    if (filter === 'archived') return p.archived;
    return true;
  }).sort((a, b) => {
    // Pinned first, then by date desc
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (b.at || 0) - (a.at || 0);
  });

  const counts = {
    active: posts.filter(p => !p.archived).length,
    archived: posts.filter(p => p.archived).length,
    all: posts.length
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <BackButton onClick={onBack} label="Today" />

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClipboardList size={28} color={styles.yellow} />
          <div>
            <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: 1.5 }}>BULLETIN BOARD</div>
            <div style={{ fontSize: 11, color: styles.textDim, letterSpacing: 1, marginTop: 2 }}>
              POST REMINDERS · {counts.active} ACTIVE · {counts.archived} ARCHIVED
            </div>
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            background: styles.yellow, color: styles.bg, border: 'none',
            padding: '12px 18px', fontFamily: 'Oswald, sans-serif', fontWeight: 700,
            fontSize: 12, letterSpacing: 1.5, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Plus size={14} strokeWidth={3} /> NEW POST
          </button>
        )}
      </div>

      {/* Info banner */}
      <div style={{
        background: styles.surface, border: `1px solid ${styles.steel}`,
        borderLeft: `4px solid ${styles.steel}`,
        padding: 12, marginBottom: 16, fontSize: 12, color: styles.text, lineHeight: 1.5
      }}>
        Pinned posts appear at the top of every Today view for the whole crew. In Phase 2 with multi-user, these'll trigger push notifications when posted.
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${styles.border}` }}>
        {[{ id: 'active', label: 'Active' }, { id: 'archived', label: 'Archived' }, { id: 'all', label: 'All' }].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'none', border: 'none',
              color: active ? styles.yellow : styles.textDim,
              padding: '10px 18px', fontFamily: 'Oswald, sans-serif', fontSize: 12, letterSpacing: 1.5,
              cursor: 'pointer', borderBottom: `2px solid ${active ? styles.yellow : 'transparent'}`,
              fontWeight: 600
            }}>
              {t.label.toUpperCase()} <span style={{ fontSize: 10, opacity: 0.6 }}>({counts[t.id]})</span>
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: styles.surface, border: `2px solid ${styles.yellow}`, padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, letterSpacing: 1.5, marginBottom: 12, color: styles.yellow }}>
            NEW POST
          </div>
          <Field label="Title *" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} placeholder="Safety meeting Tuesday 7am, Truck rotation, etc." />
          <Field label="Message" value={draft.body} onChange={v => setDraft({ ...draft, body: v })} multiline placeholder="Details for the crew..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 10, color: styles.textDim, letterSpacing: 1.5, marginBottom: 4, textTransform: 'uppercase' }}>Posted by</div>
              {employeeNames.length > 0 ? (
                <select value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} style={{
                  width: '100%', padding: 10, background: styles.bg,
                  border: `1px solid ${styles.border}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                }}>
                  <option value="">— Select —</option>
                  {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              ) : (
                <input value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} placeholder="Matt" style={{
                  width: '100%', padding: 10, background: styles.bg,
                  border: `1px solid ${styles.border}`, color: styles.text,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none'
                }} />
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 10, background: styles.bg, border: `1px solid ${styles.border}` }}>
              <input type="checkbox" checked={draft.pinned} onChange={e => setDraft({ ...draft, pinned: e.target.checked })} />
              <span style={{ fontSize: 12, fontFamily: 'Oswald, sans-serif', letterSpacing: 1 }}>📌 PIN TO TOP</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={add} disabled={!draft.title.trim()} style={{
              background: draft.title.trim() ? styles.yellow : styles.surfaceLight,
              color: draft.title.trim() ? styles.bg : styles.textFaint,
              border: 'none', padding: '8px 14px',
              fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11,
              cursor: draft.title.trim() ? 'pointer' : 'not-allowed', fontWeight: 700
            }}>POST</button>
            <button onClick={() => { setAdding(false); setDraft({ title: '', body: '', author: '', pinned: false }); }} style={{
              background: 'none', color: styles.textDim, border: `1px solid ${styles.border}`,
              padding: '8px 14px', fontFamily: 'Oswald, sans-serif', letterSpacing: 1.5, fontSize: 11, cursor: 'pointer'
            }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Posts */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: styles.textFaint, border: `2px dashed ${styles.border}` }}>
          <ClipboardList size={32} color={styles.textFaint} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: 12 }}>No {filter === 'all' ? '' : filter} posts</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(p => {
            const editing = editingId === p.id;
            return (
              <div key={p.id} style={{
                background: styles.surface,
                border: `1px solid ${p.pinned ? styles.yellow : styles.border}`,
                borderLeft: `4px solid ${p.pinned ? styles.yellow : styles.steel}`,
                padding: 14, opacity: p.archived ? 0.55 : 1
              }}>
                {editing ? (
                  <div>
                    <Field label="Title" value={p.title} onChange={v => update(p.id, { title: v })} />
                    <Field label="Message" value={p.body} onChange={v => update(p.id, { body: v })} multiline />
                    <button onClick={() => setEditingId(null)} style={{
                      background: styles.yellow, color: styles.bg, border: 'none',
                      padding: '6px 14px', fontFamily: 'Oswald, sans-serif',
                      fontSize: 11, letterSpacing: 1.5, fontWeight: 700, cursor: 'pointer'
                    }}>DONE</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        {p.pinned && <span style={{ fontSize: 14 }}>📌</span>}
                        <span style={{ fontFamily: 'Oswald, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>{p.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => update(p.id, { pinned: !p.pinned })} title={p.pinned ? 'Unpin' : 'Pin to top'} style={{
                          width: 26, height: 26, background: p.pinned ? styles.yellow : 'transparent',
                          color: p.pinned ? styles.bg : styles.textDim,
                          border: `1px solid ${p.pinned ? styles.yellow : styles.borderLight}`,
                          cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>📌</button>
                        <button onClick={() => update(p.id, { archived: !p.archived })} title={p.archived ? 'Unarchive' : 'Archive'} style={{
                          width: 26, height: 26, background: 'transparent',
                          border: `1px solid ${styles.borderLight}`,
                          color: styles.textDim, cursor: 'pointer', fontSize: 11,
                          fontFamily: 'Oswald, sans-serif', letterSpacing: 0.5
                        }}>{p.archived ? 'UN' : 'ARC'}</button>
                        <button onClick={() => setEditingId(p.id)} style={{
                          width: 26, height: 26, background: 'transparent',
                          border: `1px solid ${styles.borderLight}`, color: styles.textDim,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><Edit3 size={11} /></button>
                        <button onClick={() => remove(p)} style={{
                          width: 26, height: 26, background: 'transparent',
                          border: `1px solid ${styles.borderLight}`, color: styles.textFaint,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><Trash2 size={11} /></button>
                      </div>
                    </div>
                    {p.body && <div style={{ fontSize: 13, color: styles.text, lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.body}</div>}
                    <div style={{ fontSize: 10, color: styles.textFaint, marginTop: 8, letterSpacing: 0.5, display: 'flex', gap: 12 }}>
                      <span>{relTime(p.at)}</span>
                      {p.author && <span>· {p.author}</span>}
                      <span>· {new Date(p.at).toLocaleDateString('en-CA')}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
